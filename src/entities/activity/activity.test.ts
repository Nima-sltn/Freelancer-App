import { describe, expect, it } from "vitest";
import { auditSourceCounts, buildAuditFeed } from "./feed";
import { describeImpact, impactsForAuditEntry, DOMAINS } from "./impact";
import type { Project, Proposal, User } from "@/types";

/**
 * Behavioural tests for the cross-domain layer.
 *
 * The feed proves that server history and the local journal interleave into one
 * ordered trail; the projection proves that a write really does reach every
 * domain the product claims it does (this is the contract the audit page, the
 * journey inspector and the notification bridge all render from).
 */

function proposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    _id: "pr1",
    description: "build a landing page",
    price: 4_000_000,
    duration: 10,
    status: 1,
    user: { _id: "u2", name: "Nima" },
    projectId: "p1",
    createdAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    _id: "p1",
    title: "Landing page",
    description: "desc",
    budget: 20_000_000,
    deadline: "2026-12-01",
    tags: [],
    status: "OPEN",
    category: { _id: "c1", title: "Web" },
    owner: { _id: "u1", name: "Sara" },
    proposals: [],
    createdAt: "2026-01-02T10:00:00.000Z",
    ...overrides,
  };
}

function user(overrides: Partial<User> = {}): User {
  return {
    _id: "u3",
    name: "Ali",
    email: "ali@example.com",
    phoneNumber: "09120000003",
    role: "FREELANCER",
    status: 2,
    isActive: true,
    createdAt: "2026-01-03T10:00:00.000Z",
    ...overrides,
  };
}

describe("buildAuditFeed", () => {
  it("merges server events and local writes into one chronological feed", () => {
    const feed = buildAuditFeed({
      projects: [project()],
      users: [user()],
      writes: [
        {
          id: "tx1",
          resource: "project:p1",
          labelKey: "projects.edit",
          labelParams: { title: "Landing page" },
          state: "committed",
          createdAt: "2026-01-05T10:00:00.000Z",
        },
      ],
    });

    expect(feed.map((entry) => entry.source)).toEqual(["local", "remote", "remote"]);
    // Newest first: local write (Jan 5) > user verified (Jan 3) > project (Jan 2).
    expect(feed[0].id).toBe("tx1");
    expect(feed[0].state).toBe("committed");
    expect(new Date(feed[0].at).getTime()).toBeGreaterThan(new Date(feed[1].at).getTime());
  });

  it("emits separate events for a proposal being submitted and later decided", () => {
    const feed = buildAuditFeed({
      projects: [project({ proposals: [proposal({ status: 2, updatedAt: "2026-01-04T10:00:00.000Z" })] })],
    });

    const decided = feed.filter((entry) => entry.actionKey === "audit.proposal.status.2");
    expect(decided).toHaveLength(1);
    expect(decided[0].actorName).toBe("Sara");
    expect(feed.filter((entry) => entry.actionKey === "audit.proposal.submitted")).toHaveLength(1);
  });

  it("records closed projects and the moderation queue as first-class events", () => {
    const feed = buildAuditFeed({
      projects: [project({ status: "CLOSED", updatedAt: "2026-01-06T10:00:00.000Z" })],
      users: [user({ status: 1 })],
    });

    expect(feed.some((entry) => entry.actionKey === "audit.project.closed")).toBe(true);
    expect(feed.some((entry) => entry.actionKey === "audit.user.pending")).toBe(true);
    expect(feed.some((entry) => entry.actionKey === "audit.user.verified")).toBe(false);
  });

  it("maps resources to entity types and honours the limit", () => {
    const feed = buildAuditFeed({
      projects: [project()],
      writes: [
        { id: "a", resource: "proposal:pr1", labelKey: "x", state: "pending", createdAt: "2026-01-07" },
        { id: "b", resource: "user:u9", labelKey: "y", state: "committed", createdAt: "2026-01-08" },
      ],
      limit: 2,
    });

    expect(feed).toHaveLength(2);
    expect(feed[0].entity).toBe("user");
    expect(feed[1].entity).toBe("proposal");
  });

  it("counts sources for the page header", () => {
    const counts = auditSourceCounts(
      buildAuditFeed({ projects: [project()], writes: [{ id: "a", resource: "p", labelKey: "x", state: "queued", createdAt: "2026-01-09" }] })
    );
    expect(counts).toEqual({ remote: 1, local: 1 });
  });
});

describe("describeImpact", () => {
  it("always reaches the notification and audit domains", () => {
    const impacts = describeImpact({ resource: "project:p1", labelKey: "audit.project.created" });
    const domains = impacts.map((impact) => impact.domain);
    expect(domains).toContain("notifications");
    expect(domains).toContain("audit");
    expect(domains).toContain("projects");
  });

  it("routes an accepted proposal into wallet, trust and leaderboard", () => {
    const impacts = describeImpact({
      resource: "proposal:pr1",
      labelKey: "audit.proposal.status.2",
      state: "committed",
    }).map((impact) => impact.domain);

    expect(impacts).toEqual(
      expect.arrayContaining(["proposals", "wallet", "trust", "leaderboard", "analytics", "audit"])
    );
    expect(impacts).not.toContain("sync");
  });

  it("does not claim money moved when a proposal is only submitted", () => {
    const domains = describeImpact({
      resource: "project:p1",
      labelKey: "audit.proposal.submitted",
    }).map((impact) => impact.domain);

    expect(domains).not.toContain("wallet");
  });

  it("flags in-flight work with the sync domain", () => {
    const queued = describeImpact({
      resource: "project:p1",
      labelKey: "audit.project.created",
      state: "queued",
    }).map((impact) => impact.domain);

    expect(queued).toContain("sync");

    const committed = describeImpact({
      resource: "project:p1",
      labelKey: "audit.project.created",
      state: "committed",
    }).map((impact) => impact.domain);

    expect(committed).not.toContain("sync");
  });

  it("only a verified user reaches the trust domain", () => {
    const verified = describeImpact({ resource: "user:u1", labelKey: "audit.user.verified" }).map(
      (impact) => impact.domain
    );
    const rejected = describeImpact({ resource: "user:u1", labelKey: "audit.user.rejected" }).map(
      (impact) => impact.domain
    );

    expect(verified).toContain("trust");
    expect(rejected).not.toContain("trust");
  });

  it("de-duplicates domains so the UI cannot show a chip twice", () => {
    const impacts = describeImpact({ resource: "proposal:pr1", labelKey: "audit.proposal.status.2" });
    const domains = impacts.map((impact) => impact.domain);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it("projects audit entries the same way (one projection, two surfaces)", () => {
    const impacts = impactsForAuditEntry({
      id: "x",
      actorName: "—",
      actionKey: "audit.proposal.status.2",
      entity: "proposal",
      entityLabel: "Landing page",
      at: "2026-01-01",
      source: "local",
      state: "committed",
    }).map((impact) => impact.domain);

    expect(impacts).toEqual(
      describeImpact({ resource: "proposal:Landing page", labelKey: "audit.proposal.status.2", state: "committed" }).map(
        (impact) => impact.domain
      )
    );
  });

  it("declares every domain with a translation key", () => {
    expect(DOMAINS).toHaveLength(new Set(DOMAINS.map((entry) => entry.domain)).size);
    DOMAINS.forEach((entry) => expect(entry.labelKey).toMatch(/^impact\./));
  });
});
