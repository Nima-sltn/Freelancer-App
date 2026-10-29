import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/config/env";
import { getActiveLocale } from "@/lib/locale";
import { demoDb } from "./db";
import { DEMO_OTP_CODE, type DemoProject, type DemoState } from "./data";
import type { Category, Proposal, User } from "@/types";

/**
 * Demo transport.
 *
 * The adapter answers requests for the *unmodified* HTTP client, so no service,
 * hook or component needs to know it exists. Every route mirrors the real
 * Express controller — same paths, same envelope, same status codes and the same
 * authorization rules — which makes `VITE_API_MODE=mock` a faithful stand-in for
 * demos, offline development and end-to-end tests.
 */

/* -------------------------------------------------------------------------- */
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

class MockHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

interface RouteContext {
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, any>;
  config: InternalAxiosRequestConfig;
  state: DemoState;
}

type RouteHandler = (ctx: RouteContext) => { status?: number; data: unknown };

interface Route {
  method: string;
  path: string;
  matcher: RegExp;
  keys: string[];
  handler: RouteHandler;
}

function compile(path: string): { matcher: RegExp; keys: string[] } {
  const keys: string[] = [];
  const pattern = path
    .split("/")
    .map((segment) => {
      if (!segment.startsWith(":")) return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      keys.push(segment.slice(1));
      return "([^/]+)";
    })
    .join("/");
  return { matcher: new RegExp(`^${pattern}/?$`), keys };
}

const routes: Route[] = [];

function route(method: string, path: string, handler: RouteHandler): void {
  const { matcher, keys } = compile(path);
  routes.push({ method: method.toUpperCase(), path, matcher, keys, handler });
}

function ok(data: unknown) {
  return { status: 200, data };
}
function created(data: unknown) {
  return { status: 201, data };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseBody(config: InternalAxiosRequestConfig): Record<string, any> {
  const raw = config.data;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, any>;
  return {};
}

function resolveUrl(config: InternalAxiosRequestConfig): URL {
  const base = config.baseURL ?? "";
  const url = config.url ?? "";
  const absolute = /^https?:\/\//.test(url) ? url : `${base}${url}`;
  const parsed = new URL(absolute, "http://demo.local");
  // `params` is serialised by axios' paramsSerializer; mirror it for matching.
  const params = config.params as Record<string, unknown> | undefined;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      const strVal = Array.isArray(value)
        ? value.join(",")
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
      parsed.searchParams.set(key, strVal);
    });
  }
  return parsed;
}

/** Strips the API prefix so route definitions stay readable. */
function normalisePath(pathname: string): string {
  const withoutApi = pathname.replace(/^\/api/, "");
  return withoutApi.startsWith("/") ? withoutApi : `/${withoutApi}`;
}

/* -------------------------------------------------------------------------- */
/* auth helpers                                                               */
/* -------------------------------------------------------------------------- */

function currentUser(state: DemoState): User {
  const user = state.users.find((item) => item._id === state.sessionUserId);
  if (!user) throw new MockHttpError(401, "ابتدا وارد حساب کاربری خود شوید");
  return user;
}

function requireRole(state: DemoState, roles: User["role"][]): User {
  const user = currentUser(state);
  if (!roles.includes(user.role) || user.status !== 2) {
    throw new MockHttpError(403, "شما اجازهٔ دسترسی به این بخش را ندارید");
  }
  return user;
}

/* -------------------------------------------------------------------------- */
/* serialisers                                                                */
/* -------------------------------------------------------------------------- */

function categoryRef(state: DemoState, project: DemoProject) {
  const category =
    state.categories.find((item) => item._id === project.category._id) ?? state.categories[0];
  const isEn = getActiveLocale() === "en";
  return {
    _id: category._id,
    title: isEn ? (category.englishTitle || category.title) : category.title,
    englishTitle: category.englishTitle,
  };
}

/** Mirrors `/project/list`, which excludes owner/freelancer/proposals. */
function listItem(state: DemoState, project: DemoProject) {
  const { owner: _owner, freelancer: _freelancer, proposals: _proposals, ...rest } = project;
  const isEn = getActiveLocale() === "en";
  return {
    ...rest,
    title: isEn && project.titleEn ? project.titleEn : project.title,
    description: isEn && project.descriptionEn ? project.descriptionEn : project.description,
    category: categoryRef(state, project),
  };
}

function ownerListItem(state: DemoState, project: DemoProject) {
  const isEn = getActiveLocale() === "en";
  return {
    ...project,
    title: isEn && project.titleEn ? project.titleEn : project.title,
    description: isEn && project.descriptionEn ? project.descriptionEn : project.description,
    category: categoryRef(state, project),
  };
}

function populatedProposal(state: DemoState, proposal: Proposal): Proposal {
  const author = state.users.find((user) => user._id === (proposal.user as { _id: string })._id);
  const isEn = getActiveLocale() === "en";
  return {
    ...proposal,
    description: isEn && proposal.descriptionEn ? proposal.descriptionEn : proposal.description,
    user: author ? { _id: author._id, name: author.name } : proposal.user,
  };
}

function populatedProject(state: DemoState, project: DemoProject) {
  const isEn = getActiveLocale() === "en";
  return {
    ...project,
    title: isEn && project.titleEn ? project.titleEn : project.title,
    description: isEn && project.descriptionEn ? project.descriptionEn : project.description,
    category: categoryRef(state, project),
    proposals: project.proposals
      .map((proposalId) => state.proposals.find((item) => item._id === proposalId))
      .filter((proposal): proposal is Proposal => Boolean(proposal))
      .map((proposal) => populatedProposal(state, proposal)),
  };
}

function toPersianDigits(value: string | number): string {
  if (getActiveLocale() !== "fa") return String(value);
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

function nextId(state: DemoState, salt: number): string {
  const count = state.projects.length + state.proposals.length + state.users.length + salt;
  return (0x64f1a2b3c4d5 + count * 7919).toString(16).padEnd(24, "0").slice(0, 24);
}

const matches = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.trim().toLowerCase());

/* -------------------------------------------------------------------------- */
/* routes: authentication                                                     */
/* -------------------------------------------------------------------------- */

route("POST", "/user/get-otp", ({ body, state }) => {
  const phoneNumber = String(body.phoneNumber ?? "").trim();
  if (!/^09\d{9}$/.test(phoneNumber)) {
    throw new MockHttpError(400, "شماره موبایل معتبر را وارد کنید");
  }

  const existing = state.users.find((user) => user.phoneNumber === phoneNumber);
  if (!existing) {
    state.users.push({
      _id: nextId(state, 11),
      name: "",
      email: "",
      phoneNumber,
      role: "OWNER",
      status: 1,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  state.pendingOtp = { phoneNumber, code: DEMO_OTP_CODE };
  demoDb.persist();

  const isEn = getActiveLocale() === "en";
  return ok({
    message: isEn
      ? `Demo OTP code: ${DEMO_OTP_CODE}`
      : `کد تائید برای ورود تستی: ${toPersianDigits(DEMO_OTP_CODE)}`,
    expiresIn: 90_000,
    phoneNumber,
  });
});

route("POST", "/user/check-otp", ({ body, state }) => {
  const phoneNumber = String(body.phoneNumber ?? "").trim();
  const otp = String(body.otp ?? "").trim();

  const user = state.users.find((item) => item.phoneNumber === phoneNumber);
  if (!user) throw new MockHttpError(404, "کاربری با این مشخصات یافت نشد");
  if (otp !== DEMO_OTP_CODE) throw new MockHttpError(400, "کد ارسال شده صحیح نمیباشد");

  state.sessionUserId = user._id;
  demoDb.persist();

  const isEn = getActiveLocale() === "en";
  let welcome: string;
  if (user.isActive) {
    welcome = isEn ? "Verification successful, welcome back!" : "کد تایید شد، خوش آمدید";
  } else {
    welcome = isEn ? "Verification successful, please complete your profile" : "کد تایید شد، لطفاً اطلاعات خود را تکمیل کنید";
  }

  return ok({ message: welcome, user });
});

route("POST", "/user/complete-profile", ({ body, state }) => {
  const user = currentUser(state);
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const role = body.role === "FREELANCER" ? "FREELANCER" : "OWNER";

  if (name.length < 3) throw new MockHttpError(400, "نام و نام خانوادگی ضروری است");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new MockHttpError(400, "ایمیل معتبر وارد کنید");
  }

  const updated = demoDb.mutate((draft) => {
    const target = draft.users.find((item) => item._id === user._id)!;
    target.name = name;
    target.email = email;
    target.role = role;
    target.isActive = true;
    target.status = role === "FREELANCER" ? 2 : 1;
    target.updatedAt = new Date().toISOString();
    return target;
  });

  const isEn = getActiveLocale() === "en";
  return created({ message: isEn ? "Profile completed successfully" : "اطلاعات با موفقیت تکمیل شد", user: updated });
});

route("GET", "/user/profile", ({ state }) => ok({ user: currentUser(state) }));

route("POST", "/user/logout", ({ state }) => {
  state.sessionUserId = null;
  demoDb.persist();
  const isEn = getActiveLocale() === "en";
  return ok({ message: isEn ? "Signed out successfully" : "خروج با موفقیت انجام شد" });
});

route("GET", "/user/refresh-token", ({ state }) => {
  if (!state.sessionUserId) throw new MockHttpError(401, "ورود شما انجام نشد");
  return ok({ message: "توکن دسترسی بازخوانی شد" });
});

route("PATCH", "/user/update", ({ body, state }) => {
  const user = currentUser(state);
  demoDb.mutate((draft) => {
    const target = draft.users.find((item) => item._id === user._id)!;
    ["name", "email", "bio", "city"].forEach((field) => {
      if (typeof body[field] === "string")
        (target as unknown as Record<string, unknown>)[field] = body[field];
    });
    if (Array.isArray(body.skills)) target.skills = body.skills;
    if (typeof body.hourlyRate === "number") target.hourlyRate = body.hourlyRate;
    target.updatedAt = new Date().toISOString();
  });
  return ok({ message: "پروفایل با موفقیت به‌روزرسانی شد" });
});

/* -------------------------------------------------------------------------- */
/* routes: categories                                                         */
/* -------------------------------------------------------------------------- */

route("GET", "/category/list", ({ state }) => {
  const categories: Category[] = state.categories.map((category) => {
    const related = state.projects.filter((project) => project.category._id === category._id);
    const open = related.filter((project) => project.status === "OPEN");
    return {
      ...category,
      openProjects: open.length,
      averageBudget: related.length
        ? Math.round(related.reduce((sum, project) => sum + project.budget, 0) / related.length)
        : 0,
    };
  });
  return ok({ categories });
});

route("GET", "/category/:id", ({ params, state }) => {
  const category = state.categories.find((item) => item._id === params.id);
  if (!category) throw new MockHttpError(404, "دسته‌بندی یافت نشد");
  return ok({ category });
});

route("POST", "/admin/category/add", ({ body, state }) => {
  requireRole(state, ["ADMIN"]);
  demoDb.mutate((draft) => {
    draft.categories.push({
      _id: nextId(draft, 21),
      title: String(body.title ?? "دسته جدید"),
      englishTitle: String(body.englishTitle ?? `cat-${draft.categories.length + 1}`),
      description: String(body.description ?? ""),
      icon: "🗂️",
    });
  });
  return created({ message: "دسته‌بندی با موفقیت ایجاد شد" });
});

route("PATCH", "/admin/category/update/:id", ({ body, params, state }) => {
  requireRole(state, ["ADMIN"]);
  demoDb.mutate((draft) => {
    const target = draft.categories.find((item) => item._id === params.id);
    if (!target) throw new MockHttpError(404, "دسته‌بندی یافت نشد");
    Object.assign(target, {
      title: body.title ?? target.title,
      englishTitle: body.englishTitle ?? target.englishTitle,
      description: body.description ?? target.description,
    });
  });
  return ok({ message: "دسته‌بندی به‌روزرسانی شد" });
});

route("DELETE", "/admin/category/remove/:id", ({ params, state }) => {
  requireRole(state, ["ADMIN"]);
  demoDb.mutate((draft) => {
    const index = draft.categories.findIndex((item) => item._id === params.id);
    if (index === -1) throw new MockHttpError(404, "دسته‌بندی یافت نشد");
    draft.categories.splice(index, 1);
  });
  return ok({ message: "دسته‌بندی حذف شد" });
});

/* -------------------------------------------------------------------------- */
/* routes: projects                                                           */
/* -------------------------------------------------------------------------- */

route("GET", "/project/list", ({ query, state }) => {
  const search = query.get("search") ?? "";
  const category = query.get("category") ?? "";
  const status = query.get("status") ?? "";
  const sort = query.get("sort") ?? "";

  let projects = [...state.projects];

  if (search) {
    projects = projects.filter(
      (project) =>
        matches(project.title, search) ||
        matches(project.description, search) ||
        project.tags.some((tag) => matches(tag, search))
    );
  }
  if (status === "OPEN" || status === "CLOSED") {
    projects = projects.filter((project) => project.status === status);
  }
  if (category && !category.includes("ALL")) {
    const wanted = category.split(",");
    const ids = state.categories
      .filter((item) => wanted.includes(item.englishTitle))
      .map((item) => item._id);
    projects = projects.filter((project) => ids.includes(project.category._id));
  }

  projects.sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    return sort === "latest" ? right - left : left - right;
  });

  return ok({ projects: projects.map((project) => listItem(state, project)) });
});

route("GET", "/project/owner-projects", ({ state }) => {
  const user = requireRole(state, ["OWNER", "ADMIN"]);
  const projects =
    user.role === "ADMIN"
      ? state.projects
      : state.projects.filter((project) => project.owner._id === user._id);
  return ok({ projects: projects.map((project) => ownerListItem(state, project)) });
});

route("POST", "/project/add", ({ body, state }) => {
  const user = requireRole(state, ["OWNER", "ADMIN"]);
  const title = String(body.title ?? "").trim();
  if (title.length < 10) throw new MockHttpError(400, "عنوان پروژه باید حداقل ۱۰ کاراکتر باشد");

  const category =
    state.categories.find((item) => item._id === body.category) ?? state.categories[0];

  const project = demoDb.mutate((draft) => {
    const created: DemoProject = {
      _id: nextId(draft, 31),
      title,
      description: String(body.description ?? ""),
      budget: Number(body.budget) || 0,
      deadline: body.deadline ? new Date(body.deadline).toISOString() : new Date().toISOString(),
      tags: Array.isArray(body.tags) ? body.tags : [],
      status: "OPEN",
      category: { _id: category._id, title: category.title, englishTitle: category.englishTitle },
      owner: { _id: user._id, name: user.name },
      freelancer: null,
      proposals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    draft.projects.unshift(created);
    draft.audit.unshift({
      id: nextId(draft, 41),
      actorName: user.name,
      actionKey: "audit.project.created",
      entity: "project",
      entityLabel: created.title,
      at: created.createdAt,
      source: "remote",
    });
    return created;
  });

  const isEn = getActiveLocale() === "en";
  return created({ message: isEn ? "Project created successfully" : "پروژه با موفقیت ایجاد شد", project });
});

// Registered before `/project/:id` so the literal segment wins.
route("PATCH", "/project/update/:id", ({ body, params, state }) => {
  const user = requireRole(state, ["OWNER", "ADMIN"]);
  const result = demoDb.mutate((draft) => {
    const project = draft.projects.find((item) => item._id === params.id);
    if (!project) throw new MockHttpError(404, "پروژه یافت نشد");
    if (user.role !== "ADMIN" && project.owner._id !== user._id) {
      throw new MockHttpError(403, "اجازهٔ ویرایش این پروژه را ندارید");
    }
    if (body.title) project.title = String(body.title);
    if (body.description) project.description = String(body.description);
    if (body.budget) project.budget = Number(body.budget);
    if (body.deadline) project.deadline = new Date(body.deadline).toISOString();
    if (Array.isArray(body.tags)) project.tags = body.tags;
    if (body.category) {
      const category = draft.categories.find((item) => item._id === body.category);
      if (category) {
        project.category = {
          _id: category._id,
          title: category.title,
          englishTitle: category.englishTitle,
        };
      }
    }
    project.updatedAt = new Date().toISOString();
    return project.title;
  });
  return ok({ message: `پروژه «${result}» به‌روزرسانی شد` });
});

route("GET", "/project/:id", ({ params, state }) => {
  const user = currentUser(state);
  const project = state.projects.find((item) => item._id === params.id);
  if (!project) throw new MockHttpError(404, "پروژه یافت نشد");

  // Mirrors the widened authorization rule: freelancers may read an OPEN
  // project, or one they were awarded.
  const isOwner = project.owner._id === user._id;
  const isFreelancerAllowed =
    user.role === "FREELANCER" && (project.status === "OPEN" || project.freelancer?._id === user._id);
  if (user.role !== "ADMIN" && !isOwner && !isFreelancerAllowed) {
    throw new MockHttpError(403, "شما به این پروژه دسترسی ندارید");
  }

  return ok({ project: populatedProject(state, project) });
});

route("PATCH", "/project/:id", ({ body, params, state }) => {
  const user = requireRole(state, ["OWNER", "ADMIN"]);
  const status = body.status === "CLOSED" ? "CLOSED" : "OPEN";
  demoDb.mutate((draft) => {
    const project = draft.projects.find((item) => item._id === params.id);
    if (!project) throw new MockHttpError(404, "پروژه یافت نشد");
    if (user.role !== "ADMIN" && project.owner._id !== user._id) {
      throw new MockHttpError(403, "اجازهٔ تغییر وضعیت این پروژه را ندارید");
    }
    project.status = status;
    project.updatedAt = new Date().toISOString();
  });
  return ok({
    message: status === "OPEN" ? "وضعیت پروژه به حالت باز تغییر یافت" : "پروژه بسته شد",
  });
});

route("DELETE", "/project/:id", ({ params, state }) => {
  const user = requireRole(state, ["OWNER", "ADMIN"]);
  demoDb.mutate((draft) => {
    const index = draft.projects.findIndex((item) => item._id === params.id);
    if (index === -1) throw new MockHttpError(404, "پروژه یافت نشد");
    const project = draft.projects[index];
    if (user.role !== "ADMIN" && project.owner._id !== user._id) {
      throw new MockHttpError(403, "اجازهٔ حذف این پروژه را ندارید");
    }
    if (project.freelancer) throw new MockHttpError(400, "پروژه قابل حذف نیست");
    draft.proposals = draft.proposals.filter((item) => !project.proposals.includes(item._id));
    draft.projects.splice(index, 1);
  });
  const isEn = getActiveLocale() === "en";
  return ok({ message: isEn ? "Project removed successfully" : "پروژه با موفقیت حذف شد" });
});

/* -------------------------------------------------------------------------- */
/* routes: proposals                                                          */
/* -------------------------------------------------------------------------- */

route("GET", "/proposal/list", ({ query, state }) => {
  const user = requireRole(state, ["FREELANCER", "ADMIN"]);
  const sort = query.get("sort") ?? "";

  let proposals =
    user.role === "ADMIN"
      ? [...state.proposals]
      : state.proposals.filter((proposal) => (proposal.user as { _id: string })._id === user._id);

  proposals.sort((a, b) => {
    const left = new Date(a.createdAt ?? 0).getTime();
    const right = new Date(b.createdAt ?? 0).getTime();
    return sort === "latest" ? right - left : left - right;
  });

  return ok({ proposals: proposals.map((proposal) => populatedProposal(state, proposal)) });
});

route("POST", "/proposal/add", ({ body, state }) => {
  const user = requireRole(state, ["FREELANCER", "ADMIN"]);
  const projectId = String(body.projectId ?? "");
  const proposal = demoDb.mutate((draft) => {
    const project = draft.projects.find((item) => item._id === projectId);
    if (!project) throw new MockHttpError(404, "پروژه یافت نشد");
    if (project.status !== "OPEN") throw new MockHttpError(400, "این پروژه بسته شده است");
    if (draft.proposals.some((item) => item.projectId === projectId && (item.user as { _id: string })._id === user._id)) {
      throw new MockHttpError(400, "شما قبلاً برای این پروژه پیشنهاد ثبت کرده‌اید");
    }

    const createdProposal: Proposal = {
      _id: nextId(draft, 51),
      description: String(body.description ?? ""),
      price: Number(body.price) || 0,
      duration: Number(body.duration) || 1,
      status: 1,
      user: { _id: user._id, name: user.name },
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    draft.proposals.push(createdProposal);
    project.proposals.push(createdProposal._id);
    draft.audit.unshift({
      id: nextId(draft, 61),
      actorName: user.name,
      actionKey: "audit.proposal.submitted",
      entity: "proposal",
      entityLabel: project.title,
      at: new Date().toISOString(),
      source: "remote",
    });
    return createdProposal;
  });

  const isEn = getActiveLocale() === "en";
  return created({ message: isEn ? "Proposal submitted successfully" : "پیشنهاد با موفقیت ایجاد شد", proposal });
});

route("GET", "/proposal/:id", ({ params, state }) => {
  const proposal = state.proposals.find((item) => item._id === params.id);
  if (!proposal) throw new MockHttpError(404, "پیشنهاد یافت نشد");
  return ok({ proposal: populatedProposal(state, proposal) });
});

route("PATCH", "/proposal/:id", ({ body, params, state }) => {
  requireRole(state, ["OWNER", "ADMIN"]);
  const status = Number(body.status);
  if (![0, 1, 2].includes(status)) throw new MockHttpError(400, "وضعیت ارسال شده معتبر نیست");

  const message = demoDb.mutate((draft) => {
    const proposal = draft.proposals.find((item) => item._id === params.id);
    if (!proposal) throw new MockHttpError(404, "پیشنهاد یافت نشد");
    proposal.status = status as Proposal["status"];
    proposal.updatedAt = new Date().toISOString();

    const project = draft.projects.find((item) => item.proposals.includes(proposal._id));
    if (project) {
      const author = proposal.user as { _id: string; name: string };
      project.freelancer = status === 2 ? { _id: author._id, name: author.name } : null;
      project.status = status === 2 ? "CLOSED" : project.status;
      project.updatedAt = new Date().toISOString();
    }

    draft.audit.unshift({
      id: nextId(draft, 71),
      actorName: draft.users.find((user) => user._id === draft.sessionUserId)?.name ?? "سیستم",
      actionKey: `audit.proposal.status.${status}`,
      entity: "proposal",
      entityLabel: project?.title ?? proposal._id,
      at: new Date().toISOString(),
      source: "remote",
    });

    if (status === 2) return "وضعیت پیشنهاد تایید شد";
    if (status === 0) return "وضعیت پیشنهاد به حالت رد شده تغییر یافت";
    return "وضعیت پیشنهاد به حالت در انتظار تایید تغییر یافت";
  });

  return ok({ message });
});

/* -------------------------------------------------------------------------- */
/* routes: administration                                                     */
/* -------------------------------------------------------------------------- */

route("GET", "/admin/user/list", ({ state }) => {
  requireRole(state, ["ADMIN"]);
  return ok({ users: state.users });
});

route("PATCH", "/admin/user/verify/:userId", ({ body, params, state }) => {
  requireRole(state, ["ADMIN"]);
  const status = Number(body.status);
  if (![0, 1, 2].includes(status)) throw new MockHttpError(400, "وضعیت ارسال شده معتبر نیست");
  demoDb.mutate((draft) => {
    const user = draft.users.find((item) => item._id === params.userId);
    if (!user) throw new MockHttpError(404, "کاربر یافت نشد");
    user.status = status as User["status"];
    user.updatedAt = new Date().toISOString();
  });
  return ok({ message: "وضعیت کاربر با موفقیت تغییر کرد" });
});

route("GET", "/admin/user/profile/:userId", ({ params, state }) => {
  requireRole(state, ["ADMIN"]);
  const user = state.users.find((item) => item._id === params.userId);
  if (!user) throw new MockHttpError(404, "کاربر یافت نشد");
  return ok({ user });
});

/* -------------------------------------------------------------------------- */
/* adapter                                                                    */
/* -------------------------------------------------------------------------- */

function buildResponse(
  config: InternalAxiosRequestConfig,
  status: number,
  body: unknown
): AxiosResponse {
  return {
    data: body,
    status,
    statusText: status >= 400 ? "Error" : "OK",
    headers: new AxiosHeaders({ "content-type": "application/json" }),
    config,
    request: { responseURL: config.url },
  };
}

export function createMockAdapter(): AxiosAdapter {
  return async (config) => {
    const url = resolveUrl(config as InternalAxiosRequestConfig);
    const path = normalisePath(url.pathname);
    const method = (config.method ?? "get").toUpperCase();
    const jitter = Math.floor(Math.random() * 120);
    await delay(env.mockLatency + jitter);

    const context: RouteContext = {
      method,
      path,
      params: {},
      query: url.searchParams,
      body: parseBody(config as InternalAxiosRequestConfig),
      config: config as InternalAxiosRequestConfig,
      state: demoDb.current,
    };

    const matched = routes.find(
      (candidate) => candidate.method === method && candidate.matcher.test(path)
    );

    if (!matched) {
      const error = new MockHttpError(404, "آدرس مورد نظر یافت نشد");
      throw toAxiosError(config as InternalAxiosRequestConfig, error);
    }

    const matchResult = matched.matcher.exec(path);
    const captures = matchResult ? matchResult.slice(1) : [];
    matched.keys.forEach((key, index) => {
      context.params[key] = decodeURIComponent(captures[index] ?? "");
    });

    try {
      const result = matched.handler(context);
      const status = result.status ?? 200;
      return buildResponse(config as InternalAxiosRequestConfig, status, {
        statusCode: status,
        data: result.data,
      });
    } catch (error) {
      if (error instanceof MockHttpError) {
        throw toAxiosError(config as InternalAxiosRequestConfig, error);
      }
      throw toAxiosError(
        config as InternalAxiosRequestConfig,
        new MockHttpError(500, (error as Error)?.message || "خطای داخلی سرور نمایشی")
      );
    }
  };
}

function toAxiosError(config: InternalAxiosRequestConfig, error: MockHttpError): AxiosError {
  const body = { statusCode: error.status, message: error.message };
  return new AxiosError(
    error.message,
    String(error.status),
    config,
    undefined,
    buildResponse(config, error.status, body)
  );
}

export { demoDb };
