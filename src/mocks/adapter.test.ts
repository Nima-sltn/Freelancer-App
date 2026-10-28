import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockAdapter } from "./adapter";
import { demoDb } from "./db";
import { DEMO_OTP_CODE } from "./data";

/**
 * Contract tests for the demo transport.
 *
 * The adapter is the *only* difference between running the whole product with
 * and without a backend, so its behaviour is verified like an API: envelope,
 * status codes and authorization rules must match the Express controllers. Any
 * drift here silently breaks every screen in demo mode.
 */

vi.mock("@/config/env", async () => {
  const actual = await vi.importActual<typeof import("@/config/env")>("@/config/env");
  return { ...actual, env: { ...actual.env, mockLatency: 0, useMocks: true } };
});

const adapter = createMockAdapter();

interface Envelope<T> {
  statusCode: number;
  data: T;
}

async function call<T = unknown>(
  method: string,
  url: string,
  options: { body?: unknown; params?: Record<string, unknown> } = {}
): Promise<Envelope<T>> {
  const config = {
    method,
    url,
    baseURL: "/api",
    data: options.body,
    params: options.params,
    headers: new AxiosHeaders({ "content-type": "application/json" }),
  } as unknown as InternalAxiosRequestConfig;

  const response = await adapter(config);
  return response.data as Envelope<T>;
}

async function expectFailure(
  method: string,
  url: string,
  options: { body?: unknown } = {}
): Promise<AxiosError> {
  try {
    await call(method, url, options);
    throw new Error(`Expected ${method} ${url} to fail`);
  } catch (error) {
    expect(error).toBeInstanceOf(AxiosError);
    return error as AxiosError;
  }
}

function signInAs(phoneNumber: string): string {
  const user = demoDb.current.users.find((candidate) => candidate.phoneNumber === phoneNumber);
  if (!user) throw new Error(`Seed user ${phoneNumber} is missing`);
  demoDb.setSession(user._id);
  return user._id;
}

beforeEach(() => {
  demoDb.reset();
});

describe("envelope and routing", () => {
  it("wraps every payload in { statusCode, data } like the API", async () => {
    const envelope = await call<{ projects: unknown[] }>("GET", "/project/list");
    expect(envelope.statusCode).toBe(200);
    expect(Array.isArray(envelope.data.projects)).toBe(true);
    expect(envelope.data.projects.length).toBeGreaterThan(0);
  });

  it("answers unknown routes with 404", async () => {
    const error = await expectFailure("GET", "/definitely/not/a/route");
    expect(error.response?.status).toBe(404);
  });

  it("keeps the list projection free of nested owner and proposal data", async () => {
    const envelope = await call<{ projects: Array<Record<string, unknown>> }>(
      "GET",
      "/project/list"
    );
    const first = envelope.data.projects[0];
    expect(first).not.toHaveProperty("owner");
    expect(first).not.toHaveProperty("freelancer");
    expect(first).not.toHaveProperty("proposals");
    expect(first.category).toMatchObject({ title: expect.any(String) });
  });

  it("applies list filters, exactly like the query-string contract", async () => {
    const open = await call<{ projects: unknown[] }>("GET", "/project/list", {
      params: { status: "OPEN", sort: "latest" },
    });
    const all = await call<{ projects: Array<{ title: string }> }>("GET", "/project/list");
    expect(open.data.projects.length).toBeLessThanOrEqual(all.data.projects.length);

    const term = all.data.projects[0].title.slice(0, 6);
    const search = await call<{ projects: Array<{ title: string }> }>("GET", "/project/list", {
      params: { search: term },
    });
    expect(search.data.projects.length).toBeGreaterThan(0);
    expect(search.data.projects.every((project) => project.title.includes(term))).toBe(true);
  });
});

describe("authentication", () => {
  it("rejects a protected route when signed out", async () => {
    const error = await expectFailure("GET", "/user/profile");
    expect(error.response?.status).toBe(401);
  });

  it("rejects the refresh endpoint when there is no session", async () => {
    const error = await expectFailure("GET", "/user/refresh-token");
    expect(error.response?.status).toBe(401);
  });

  it("runs the full OTP flow and establishes a session", async () => {
    const requested = await call<{ message: string; phoneNumber: string }>("POST", "/user/get-otp", {
      body: { phoneNumber: "09120000001" },
    });
    expect(requested.statusCode).toBe(200);
    // The testing code is echoed back in the API message so demos are usable.
    expect(requested.data.message).toContain("۱");

    const wrong = await expectFailure("POST", "/user/check-otp", {
      body: { phoneNumber: "09120000001", otp: "000000" },
    });
    expect(wrong.response?.status).toBe(400);

    const verified = await call<{ user: { role: string } }>("POST", "/user/check-otp", {
      body: { phoneNumber: "09120000001", otp: DEMO_OTP_CODE },
    });
    expect(verified.data.user.role).toBe("ADMIN");
    expect(demoDb.sessionUserId).not.toBeNull();

    const refreshed = await call("GET", "/user/refresh-token");
    expect(refreshed.statusCode).toBe(200);
  });

  it("rejects an invalid phone number before creating anything", async () => {
    const error = await expectFailure("POST", "/user/get-otp", { body: { phoneNumber: "123" } });
    expect(error.response?.status).toBe(400);
  });

  it("signs out", async () => {
    signInAs("09120000002");
    const response = await call("POST", "/user/logout");
    expect(response.statusCode).toBe(200);
    expect(demoDb.sessionUserId).toBeNull();

    const error = await expectFailure("GET", "/user/profile");
    expect(error.response?.status).toBe(401);
  });
});

describe("authorization", () => {
  it("lets an admin read the user list", async () => {
    signInAs("09120000001");
    const envelope = await call<{ users: unknown[] }>("GET", "/admin/user/list");
    expect(envelope.data.users.length).toBeGreaterThan(3);
  });

  it("forbids a freelancer from the admin console", async () => {
    signInAs("09120000003");
    const error = await expectFailure("GET", "/admin/user/list");
    expect(error.response?.status).toBe(403);
  });

  it("requires an owner or admin to read owner projects", async () => {
    const signedOut = await expectFailure("GET", "/project/owner-projects");
    expect(signedOut.response?.status).toBe(401);

    signInAs("09120000003");
    const forbidden = await expectFailure("GET", "/project/owner-projects");
    expect(forbidden.response?.status).toBe(403);

    const ownerId = signInAs("09120000002");
    const envelope = await call<{ projects: Array<{ owner: { _id: string } }> }>(
      "GET",
      "/project/owner-projects"
    );
    expect(envelope.data.projects.every((project) => project.owner._id === ownerId)).toBe(true);
  });

  it("refuses to verify a user with an invalid status", async () => {
    signInAs("09120000001");
    const target = demoDb.current.users.find((user) => user.phoneNumber === "09120000004");
    const error = await expectFailure("PATCH", `/admin/user/verify/${target?._id}`, {
      body: { status: 9 },
    });
    expect(error.response?.status).toBe(400);
  });
});

describe("cross-domain write then read", () => {
  it("persists a created project and exposes it in the list and the audit trail", async () => {
    signInAs("09120000002");
    const categoryId = demoDb.current.categories[0]._id;

    const created = await call<{ project: { _id: string; title: string } }>(
      "POST",
      "/project/add",
      {
        body: {
          title: "پروژه تستی برای اعتبارسنجی قرارداد",
          description: "توضیح کامل پروژه تستی برای بررسی رفتار نمایشی.",
          budget: 25_000_000,
          deadline: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          tags: ["React"],
          category: categoryId,
        },
      }
    );
    expect(created.statusCode).toBe(201);

    const list = await call<{ projects: Array<{ _id: string }> }>("GET", "/project/list");
    expect(list.data.projects.some((project) => project._id === created.data.project._id)).toBe(
      true
    );

    const audit = demoDb.current.audit[0];
    expect(audit.actionKey).toBe("audit.project.created");
    expect(audit.source).toBe("remote");
  });

  it("rejects a project whose title is too short, before mutating anything", async () => {
    signInAs("09120000002");
    const before = demoDb.current.projects.length;
    const error = await expectFailure("POST", "/project/add", {
      body: { title: "کوتاه", category: demoDb.current.categories[0]._id },
    });
    expect(error.response?.status).toBe(400);
    expect(demoDb.current.projects).toHaveLength(before);
  });

  it("verifies a pending user and reflects it on the public profile", async () => {
    signInAs("09120000001");
    const target = demoDb.current.users.find((user) => user.phoneNumber === "09120000004");
    if (!target) throw new Error("pending demo user missing");

    await call("PATCH", `/admin/user/verify/${target._id}`, { body: { status: 2 } });

    const profile = await call<{ user: { status: number } }>(
      "GET",
      `/admin/user/profile/${target._id}`
    );
    expect(profile.data.user.status).toBe(2);
  });
});
