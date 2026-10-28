import type { Category, Project, Proposal, User } from "@/types";

/**
 * Typed fixture builders.
 *
 * Tests should describe the field they care about and inherit sane defaults for
 * the rest. Building fixtures by hand (`as Project`) is what makes test suites
 * rot: the moment a required field is added to a domain type, hand-written
 * objects silently become invalid. Spreading a factory keeps every test
 * compiling and forces the compiler to point at this single file instead.
 */

const DAY = 86_400_000;

export function daysFromNow(days: number): string {
  return new Date(Date.now() + days * DAY).toISOString();
}

export function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    _id: "cat-1",
    title: "طراحی وب",
    englishTitle: "Web Design",
    ...overrides,
  };
}

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    _id: "user-1",
    name: "نیما سلطانی",
    email: "nima@example.com",
    phoneNumber: "09120000002",
    role: "OWNER",
    status: 2,
    isActive: true,
    skills: ["React", "TypeScript"],
    hourlyRate: 500_000,
    rating: 4.6,
    reviewsCount: 12,
    completedProjects: 9,
    responseHours: 6,
    createdAt: daysFromNow(-400),
    updatedAt: daysFromNow(-1),
    ...overrides,
  };
}

export function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    _id: "project-1",
    title: "بازطراحی فروشگاه اینترنتی",
    description: "بازطراحی کامل رابط کاربری فروشگاه با React و طراحی واکنش‌گرا.",
    budget: 40_000_000,
    deadline: daysFromNow(30),
    tags: ["React", "Tailwind"],
    status: "OPEN",
    category: { _id: "cat-1", title: "طراحی وب", englishTitle: "Web Design" },
    owner: { _id: "user-1", name: "نیما سلطانی" },
    proposals: [],
    createdAt: daysFromNow(-5),
    updatedAt: daysFromNow(-1),
    ...overrides,
  };
}

export function buildProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    _id: "proposal-1",
    description: "پیشنهاد اجرای پروژه با تیم سه نفره و تحویل مرحله‌ای.",
    price: 35_000_000,
    duration: 25,
    status: 1,
    user: { _id: "user-3", name: "سارا محمدی" },
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-2),
    ...overrides,
  };
}
