import type {
  AppNotification,
  AuditEntry,
  Category,
  Conversation,
  LedgerEntry,
  Proposal,
  Review,
  User,
} from "@/types";
import { PLATFORM_FEE_RATE } from "@/config/constants";

/**
 * Deterministic demo dataset.
 *
 * The generator is seeded so that charts, tables and tests see the same data on
 * every run, yet all timestamps are anchored to "now" so the dashboards look
 * alive. It is only ever loaded in `VITE_API_MODE=mock`.
 */

export interface DemoState {
  version: number;
  users: User[];
  categories: Category[];
  projects: DemoProject[];
  proposals: Proposal[];
  reviews: Review[];
  ledger: LedgerEntry[];
  notifications: AppNotification[];
  conversations: Conversation[];
  audit: AuditEntry[];
  sessionUserId: string | null;
  pendingOtp: { phoneNumber: string; code: string } | null;
}

/** The API returns populated references; the demo mirrors that shape. */
export interface DemoProject {
  _id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  budget: number;
  deadline: string;
  tags: string[];
  status: "OPEN" | "CLOSED";
  category: { _id: string; title: string; englishTitle?: string };
  owner: { _id: string; name: string };
  freelancer?: { _id: string; name: string } | null;
  proposals: string[];
  createdAt: string;
  updatedAt: string;
}

export const DEMO_OTP_CODE = "111111";

export const DEMO_ACCOUNTS = [
  { labelKey: "demo.account.admin", phoneNumber: "09120000001" },
  { labelKey: "demo.account.owner", phoneNumber: "09120000002" },
  { labelKey: "demo.account.freelancer", phoneNumber: "09120000003" },
  { labelKey: "demo.account.pending", phoneNumber: "09120000004" },
] as const;

const FIRST_NAMES = [
  "نیما",
  "سارا",
  "امیرحسین",
  "مریم",
  "رضا",
  "زهرا",
  "پویا",
  "نگار",
  "کیوان",
  "هستی",
  "علی",
  "شیوا",
  "بهراد",
  "مهدیه",
  "آرش",
  "پریسا",
  "سپهر",
  "الهام",
];
const LAST_NAMES = [
  "سلطانی",
  "محمدی",
  "کاظمی",
  "رستمی",
  "امینی",
  "شریفی",
  "نوروزی",
  "براتی",
  "حیدری",
  "صادقی",
  "فروغی",
  "یزدانی",
];

const CATEGORY_SEED = [
  { title: "طراحی رابط کاربری", englishTitle: "design", icon: "🎨" },
  { title: "برنامه‌نویسی وب", englishTitle: "web", icon: "🌐" },
  { title: "اپلیکیشن موبایل", englishTitle: "mobile", icon: "📱" },
  { title: "دیجیتال مارکتینگ", englishTitle: "marketing", icon: "📈" },
  { title: "تولید محتوا", englishTitle: "content", icon: "✍️" },
  { title: "علم داده و تحلیل", englishTitle: "data", icon: "📊" },
  { title: "هوش مصنوعی", englishTitle: "ai", icon: "🤖" },
  { title: "زیرساخت و دواپس", englishTitle: "devops", icon: "🛠️" },
];

const TAG_POOL = [
  "React",
  "TypeScript",
  "Figma",
  "Tailwind",
  "Node.js",
  "MongoDB",
  "Next.js",
  "Framer Motion",
  "SEO",
  "Copywriting",
  "Python",
  "Docker",
  "Kubernetes",
  "Figma Design System",
  "Analytics",
  "LLM",
];

const PROJECT_SEED = [
  ["بازطراحی داشبورد فروشگاهی", "نیاز به بازطراحی کامل داشبورد مدیریتی یک فروشگاه اینترنتی با تمرکز بر خوانایی داده‌ها و سرعت بارگذاری داریم.", "E-commerce Analytics Dashboard Redesign", "Full redesign of our e-commerce operations dashboard focusing on data readability, responsiveness and sub-second load times."],
  ["توسعه اپلیکیشن سفارش آنلاین", "اپلیکیشن موبایل سفارش غذا با پنل فروشنده، پرداخت آنلاین و پیگیری زندهٔ سفارش.", "On-Demand Food Delivery Mobile App", "Cross-platform mobile application with real-time driver tracking, payment integration, and vendor order management."],
  ["کمپین دیجیتال مارکتینگ محصول جدید", "طراحی و اجرای کمپین معرفی یک محصول نرم‌افزاری شامل استراتژی محتوا و تبلیغات پرداختی.", "SaaS Product Digital Marketing Campaign", "End-to-end launch campaign including positioning, content calendar, performance marketing, and conversion funnels."],
  ["راه‌اندازی زیرساخت ابری چند محیطی", "استقرار سرویس‌ها روی Kubernetes با CI/CD، مانیتورینگ و بازیابی از بحران.", "Multi-Region Cloud Infrastructure & CI/CD", "Automated deployment pipeline on Kubernetes with Prometheus/Grafana monitoring and disaster recovery plans."],
  ["موتور پیشنهاددهی مبتنی بر هوش مصنوعی", "پیاده‌سازی سامانهٔ پیشنهاد محصول با یادگیری ماشین و ارزیابی A/B.", "AI-Powered Recommendation Engine", "Real-time collaborative filtering and recommendation microservice with A/B testing evaluation."],
  ["تدوین استراتژی محتوای وبلاگ", "تولید تقویم محتوایی سه‌ماهه همراه با نگارش ۲۰ مقاله تخصصی و بهینه‌سازی برای موتور جست‌وجو.", "SEO Content Strategy & Technical Articles", "Quarterly content roadmap including 20 in-depth technical guides with on-page SEO optimization."],
  ["ساخت پنل تحلیل دادهٔ کاربران", "داشبورد تحلیلی برای تیم محصول شامل قیف تبدیل، نگهداشت و گزارش خروجی اکسل.", "Product Analytics & Cohort Retention Tool", "Self-serve analytics workspace featuring conversion funnels, retention cohorts, and automated Excel exports."],
  ["طراحی سیستم دیزاین سازمانی", "ساخت سیستم دیزاین یکپارچه با توکن‌های طراحی و کتابخانهٔ کامپوننت مستندسازی‌شده.", "Enterprise Design System & Token Library", "Unified Figma component library with semantic design tokens and React Storybook documentation."],
  ["بهینه‌سازی سرعت وب‌سایت شرکتی", "کاهش زمان بارگذاری صفحات اصلی به زیر یک ثانیه و بهبود امتیاز Core Web Vitals.", "Core Web Vitals & Frontend Performance Audit", "Audit and optimization to achieve sub-second LCP, zero CLS, and 95+ Google Lighthouse scores."],
  ["پیاده‌سازی درگاه پرداخت اقساطی", "افزودن قابلیت پرداخت اقساطی به فروشگاه با تسویهٔ خودکار و گزارش مالی.", "BNPL Installment Gateway Integration", "Buy-now-pay-later checkout integration with ledger synchronization and automatic reconciliation."],
  ["تولید ویدیوهای آموزشی محصول", "ساخت ۱۲ ویدیوی آموزشی کوتاه با زیرنویس فارسی و دوبله انگلیسی.", "Product Walkthrough & Explainer Videos", "Series of 12 crisp product walkthrough videos with dynamic motion graphics and bilingual subtitles."],
  ["مهاجرت سامانهٔ قدیمی به معماری میکروسرویس", "شکستن یک سامانهٔ یکپارچه به سرویس‌های مستقل با قرارداد API مشخص.", "Legacy Monolith to Microservices Migration", "Decomposing monolithic backend into decoupled domain services with strict OpenAPI contracts."],
  ["طراحی رابط اپلیکیشن بانکی", "بازطراحی جریان انتقال وجه و افزودن حالت تاریک مطابق دستورالعمل‌های دسترس‌پذیری.", "Fintech Mobile Banking App UX/UI", "Revamped transfer flows, biometric security screens, and accessible dark mode following WCAG 2.1."],
  ["راه‌اندازی ربات پشتیبانی هوشمند", "ساخت دستیار پشتیبانی فارسی‌زبان با اتصال به دانش‌نامهٔ شرکت.", "AI Customer Support Assistant", "Retrieval-augmented conversational agent integrated with the company knowledge base and ticketing desk."],
  ["تحلیل رفتار مشتریان با کوئری‌های پیشرفته", "استخراج الگوهای خرید و ساخت مدل پیش‌بینی ریزش مشتری.", "Customer Behavior & Churn Prediction Model", "Machine learning churn pipeline analyzing usage drop-off and transaction telemetry."],
  ["ساخت مارکت‌پلیس خدمات محلی", "پلتفرم دوطرفه برای خدمات محلی با پروفایل ارائه‌دهنده و سیستم امتیازدهی.", "Local Services Two-Sided Marketplace", "Marketplace platform with provider verification, dynamic scheduling, and verified escrow reviews."],
  ["بهبود تجربهٔ کاربری فرایند ثبت‌نام", "کاهش نرخ ریزش در فرم ثبت‌نام و افزودن احراز هویت دو مرحله‌ای.", "Onboarding Funnel Optimization & 2FA", "Frictionless sign-up UX redesign with passkeys, two-factor auth, and a 25% bounce reduction target."],
  ["تولید هویت بصری برند", "طراحی لوگو، رنگ سازمانی، تایپوگرافی و راهنمای برند.", "Brand Identity & Visual Style Guide", "Comprehensive brand identity system including logo marks, color tokens, typography, and brand book."],
  ["راه‌اندازی سیستم گزارش‌گیری مالی", "ساخت گزارش‌های مالی خودکار با خروجی PDF و همگام‌سازی با نرم‌افزار حسابداری.", "Automated Financial Reporting & Invoicing", "Automated bookkeeping service with PDF invoice generation and multi-currency accounting sync."],
  ["توسعه افزونهٔ مرورگر برای خرید", "افزونه‌ای که قیمت محصولات را در فروشگاه‌های مختلف مقایسه می‌کند.", "Smart Shopping Browser Extension", "Manifest V3 browser extension comparing pricing trends and coupon codes across top retailers."],
  ["بومی‌سازی اپلیکیشن برای بازارهای عربی", "افزودن پشتیبانی چندزبانه، تقویم هجری و درگاه پرداخت منطقه‌ای.", "MENA Regional Localization & Payments", "Comprehensive RTL localization with regional payment gateways and localized calendar adapters."],
  ["ساخت سامانهٔ نظرسنجی کارکنان", "ابزار داخلی برای سنجش رضایت کارکنان با تحلیل ناشناس نتایج.", "Employee Pulse & Anonymous Survey Platform", "Internal sentiment pulse engine with differential privacy and sentiment summary dashboards."],
  ["طراحی نقشهٔ راه فنی محصول", "تدوین نقشهٔ راه فنی شش‌ماهه همراه با برآورد منابع و ریسک‌ها.", "Technical Architecture Roadmap & Tech Spec", "6-month technical architecture plan with capacity forecasting, SLO definitions, and risk mitigations."],
  ["بهینه‌سازی هزینهٔ زیرساخت ابری", "کاهش ۳۰ درصدی هزینهٔ ماهانه با بازمعماری و سیاست‌های مقیاس‌گذاری.", "FinOps Cloud Cost Optimization", "Infrastructure audit reducing compute and database cloud expenditure by 30% without performance loss."],
];

const PROPOSAL_SEED: Array<[string, string]> = [
  ["با بررسی دقیق نیاز شما، پیشنهاد می‌کنم پروژه را در سه فاز اجرا کنیم تا در هر مرحله بازخورد بگیریم و ریسک را کاهش دهیم.", "After reviewing your specifications, I propose delivering in three agile milestones to ensure rapid feedback and minimize project risk."],
  ["تیم ما سابقهٔ اجرای مشابه در حوزهٔ شما را دارد و می‌توانیم نمونه‌کارهای مرتبط را ارسال کنیم.", "Our team has delivered identical scopes in your sector; happy to share verified portfolio references and architectures."],
  ["برنامهٔ اجرایی شامل تحلیل نیاز، طراحی، پیاده‌سازی و تحویل مستند شده است و در هر گام گزارش پیشرفت ارسال می‌شود.", "Execution plan covers requirements analysis, design, implementation, and automated test documentation with weekly sprint demos."],
  ["برای رعایت بودجهٔ شما می‌توانم دامنهٔ فاز نخست را کوچک‌تر کنم و قابلیت‌های پیشرفته را در فاز دوم اضافه کنیم.", "To accommodate your target budget, we can streamline the phase 1 scope and ship advanced features in phase 2."],
  ["کیفیت کد، تست خودکار و مستندسازی بخشی از تعهد ماست؛ تحویل نهایی همراه با آموزش تیم شما خواهد بود.", "Code craftsmanship, automated test suites, and OpenAPI documentation are guaranteed; handoff includes live team walkthrough."],
  ["تحویل در بازهٔ اعلام‌شده تضمین می‌شود؛ در صورت تأخیر، بخشی از هزینه به‌عنوان جریمه کسر خواهد شد.", "Milestone delivery within the specified schedule is guaranteed with transparent progress reports throughout."],
];

const REVIEW_SEED = [
  "همکاری بسیار دقیق و حرفه‌ای بود؛ ارتباط به‌موقع و تحویل پیش از موعد.",
  "کیفیت خروجی فراتر از انتظار ما بود و مستندسازی کاملی تحویل داده شد.",
  "در طول پروژه انعطاف خوبی داشتند و تغییرات را با کیفیت اعمال کردند.",
  "کمی در برآورد زمان خوش‌بین بودند اما نتیجهٔ نهایی ارزش انتظار را داشت.",
  "پیشنهاد می‌کنم؛ تسلط فنی بالا و پاسخ‌گویی سریع.",
];

type Rng = () => number;

/** Linear congruential generator — deterministic across runs and platforms. */
function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function intBetween(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickMany<T>(rng: Rng, list: readonly T[], count: number): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}

let idCounter = 0;
/** Produces 24-character hex identifiers that look like Mongo ObjectIds. */
function objectId(prefix: number): string {
  idCounter += 1;
  const head = (0x64f1a2b3c4d5 + prefix).toString(16).padStart(12, "0");
  const tail = (0x100000000 + idCounter).toString(16).slice(-12).padStart(12, "0");
  return `${head}${tail}`.slice(0, 24);
}

function daysAgo(now: Date, days: number, hourOffset = 9): string {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hourOffset, intBetween(createRng(days + hourOffset), 0, 59), 0, 0);
  return date.toISOString();
}

function daysAhead(now: Date, days: number): string {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(18, 0, 0, 0);
  return date.toISOString();
}


const DEFAULT_BIOS: Record<User["role"], string> = {
  FREELANCER: "فریلنسر با تجربهٔ اجرای پروژه‌های وب و محصول؛ علاقه‌مند به همکاری‌های بلندمدت.",
  OWNER: "کارفرما و مدیر محصول در حال ساخت تیم‌های چابک برای پروژه‌های دیجیتال.",
  ADMIN: "مدیر پلتفرم فریلنس‌هاب؛ مسئول تأیید کاربران و نظارت بر جریان کار.",
};

function rollUserStatus(roll: number): User["status"] {
  if (roll > 0.75) return 1;
  if (roll > 0.65) return 0;
  return 2;
}

function determineProposalStatus(isWinner: boolean, roll: number): Proposal["status"] {
  if (isWinner) return 2;
  if (roll > 0.72) return 2;
  if (roll > 0.5) return 1;
  if (roll > 0.35) return 0;
  return 1;
}

function determineDemoPipelineStatus(i: number): Proposal["status"] {
  if (i % 4 === 0) return 2;
  if (i % 3 === 0) return 1;
  if (i % 5 === 0) return 0;
  return 1;
}

const SKILL_POOL = [
  "React",
  "TypeScript",
  "UI Design",
  "Node.js",
  "Python",
  "SEO",
  "Copywriting",
  "Kubernetes",
  "Data Analysis",
  "Machine Learning",
  "Figma",
  "Product Management",
];

/**
 * Builds the full demo state. `now` is injectable so tests can pin the clock and
 * assert on derived analytics without flaking.
 */

function seedUsers(now: Date, rng: Rng): User[] {
  const users: User[] = [];

  const makeUser = (config: {
    name: string;
    phoneNumber: string;
    role: User["role"];
    status: User["status"];
    isActive: boolean;
    index: number;
    skills?: string[];
    rating?: number;
    completedProjects?: number;
  }): User => ({
    _id: objectId(500 + config.index),
    name: config.name,
    email: config.phoneNumber + "@freelancehub.demo",
    phoneNumber: config.phoneNumber,
    role: config.role,
    status: config.status,
    isActive: config.isActive,
    avatarUrl: undefined,
    bio: DEFAULT_BIOS[config.role],
    skills: config.skills ?? pickMany(rng, SKILL_POOL, intBetween(rng, 3, 6)),
    city: pick(rng, ["تهران", "اصفهان", "مشهد", "شیراز", "تبریز"]),
    hourlyRate: intBetween(rng, 4, 40) * 100_000,
    rating: config.rating ?? Number((3.6 + rng() * 1.4).toFixed(1)),
    reviewsCount: intBetween(rng, 3, 48),
    completedProjects: config.completedProjects ?? intBetween(rng, 2, 34),
    responseHours: intBetween(rng, 1, 30),
    createdAt: daysAgo(now, intBetween(rng, 60, 700)),
    updatedAt: daysAgo(now, intBetween(rng, 1, 40)),
  });

  users.push(
    makeUser({
      name: "نیما سلطانی",
      phoneNumber: "09120000001",
      role: "ADMIN",
      status: 2,
      isActive: true,
      index: 1,
      rating: 4.9,
      completedProjects: 120,
    }),
    makeUser({
      name: "سارا محمدی",
      phoneNumber: "09120000002",
      role: "OWNER",
      status: 2,
      isActive: true,
      index: 2,
      rating: 4.7,
      completedProjects: 63,
    }),
    makeUser({
      name: "امیرحسین کاظمی",
      phoneNumber: "09120000003",
      role: "FREELANCER",
      status: 2,
      isActive: true,
      index: 3,
      rating: 4.8,
      completedProjects: 47,
    }),
    makeUser({
      name: "مریم رستمی",
      phoneNumber: "09120000004",
      role: "OWNER",
      status: 1,
      isActive: true,
      index: 4,
      rating: 4.2,
      completedProjects: 8,
    })
  );

  for (let i = 5; i <= 18; i += 1) {
    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, LAST_NAMES);
    const role = rng() > 0.45 ? "FREELANCER" : "OWNER";
    const statusRoll = rng();
    users.push(
      makeUser({
        name: first + " " + last,
        phoneNumber: "0912" + String(1000000 + i * 37).slice(0, 7),
        role,
        status: rollUserStatus(statusRoll),
        isActive: true,
        index: i,
      })
    );
  }
  return users;
}

function seedProjectsAndProposals(
  now: Date,
  rng: Rng,
  categories: Category[],
  users: User[]
): { projects: DemoProject[]; proposals: Proposal[] } {
  const owners = users.filter((user) => user.role === "OWNER" && user.status === 2);
  const freelancers = users.filter((user) => user.role === "FREELANCER" && user.status === 2);

  const projects: DemoProject[] = [];
  PROJECT_SEED.forEach(([title, description, titleEn, descriptionEn], index) => {
    const category = categories[index % categories.length];
    const owner = owners[index % owners.length];
    const createdAt = daysAgo(now, intBetween(rng, 6, 260), intBetween(rng, 8, 20));
    const status: DemoProject["status"] = rng() > 0.62 ? "CLOSED" : "OPEN";
    const budgetBase = intBetween(rng, 3, 140) * 1_000_000;

    projects.push({
      _id: objectId(1000 + index),
      title,
      titleEn,
      description,
      descriptionEn,
      budget: budgetBase,
      deadline: daysAhead(now, intBetween(rng, -12, 120)),
      tags: pickMany(rng, TAG_POOL, intBetween(rng, 2, 4)),
      status,
      category: { _id: category._id, title: category.title, englishTitle: category.englishTitle },
      owner: { _id: owner._id, name: owner.name },
      freelancer:
        status === "CLOSED" && rng() > 0.25
          ? (() => {
              const freelancer = freelancers[index % freelancers.length];
              return { _id: freelancer._id, name: freelancer.name };
            })()
          : null,
      proposals: [],
      createdAt,
      updatedAt: createdAt,
    });
  });

  const proposals: Proposal[] = [];
  projects.forEach((project, projectIndex) => {
    const proposalCount = intBetween(rng, 0, 6);
    const authors = pickMany(rng, freelancers, Math.min(proposalCount, freelancers.length));

    authors.forEach((author, authorIndex) => {
      const priceFactor = 0.6 + rng() * 0.9;
      const createdAt = daysAgo(now, Math.max(1, intBetween(rng, 1, 200)), intBetween(rng, 8, 22));
      const statusRoll = rng();
      const isWinner = project.status === "CLOSED" && authorIndex === projectIndex % Math.max(authors.length, 1);
      const status: Proposal["status"] = determineProposalStatus(isWinner, statusRoll);

      const [descFa, descEn] = pick(rng, PROPOSAL_SEED);
      const proposal: Proposal = {
        _id: objectId(3000 + projectIndex * 10 + authorIndex),
        description: descFa,
        descriptionEn: descEn,
        price: Math.round((project.budget * priceFactor) / 100_000) * 100_000,
        duration: intBetween(rng, 3, 90),
        status,
        user: { _id: author._id, name: author.name },
        projectId: project._id,
        createdAt,
        updatedAt: createdAt,
      };

      project.proposals.push(proposal._id);
      proposals.push(proposal);
    });
  });

  const demoFreelancer = users[2];
  const demoOwner = users[1];
  const unassignedOpen = projects.filter((project) => project.status === "OPEN");

  for (let i = 0; i < Math.min(9, unassignedOpen.length); i += 1) {
    const project = unassignedOpen[i];
    const alreadyMine = proposals.some(
      (proposal) => proposal.projectId === project._id && (proposal.user as User)._id === demoFreelancer._id
    );
    if (alreadyMine) continue;
    const createdAt = daysAgo(now, intBetween(rng, 1, 60), intBetween(rng, 8, 22));
    const status: Proposal["status"] = determineDemoPipelineStatus(i);
    const [descFa, descEn] = pick(rng, PROPOSAL_SEED);
    const proposal: Proposal = {
      _id: objectId(9000 + i),
      description: descFa,
      descriptionEn: descEn,
      price: Math.round((project.budget * (0.75 + rng() * 0.3)) / 100_000) * 100_000,
      duration: intBetween(rng, 7, 60),
      status,
      user: { _id: demoFreelancer._id, name: demoFreelancer.name },
      projectId: project._id,
      createdAt,
      updatedAt: createdAt,
    };
    project.proposals.push(proposal._id);
    proposals.push(proposal);
  }

  const ownerProjects = projects.filter((project) => project.owner._id === demoOwner._id);
  if (ownerProjects.length < 5) {
    projects.slice(0, 5).forEach((project, index) => {
      if (project.owner._id === demoOwner._id) return;
      project.owner = { _id: demoOwner._id, name: demoOwner.name };
      if (index % 2 === 0) project.status = "OPEN";
    });
  }

  return { projects, proposals };
}

function seedReviewsAndLedger(
  now: Date,
  rng: Rng,
  projects: DemoProject[],
  proposals: Proposal[]
): { reviews: Review[]; ledger: LedgerEntry[] } {
  const reviews: Review[] = [];
  proposals
    .filter((proposal) => proposal.status === 2)
    .slice(0, 14)
    .forEach((proposal, index) => {
      const project = projects.find((item) => item._id === proposal.projectId)!;
      reviews.push({
        id: objectId(6100 + index),
        projectId: project._id,
        projectTitle: project.title,
        fromName: project.owner.name,
        toId: (proposal.user as User)._id,
        rating: intBetween(rng, 3, 5),
        comment: pick(rng, REVIEW_SEED),
        createdAt: proposal.createdAt as string,
      });
    });

  const ledger: LedgerEntry[] = [];
  proposals
    .filter((proposal) => proposal.status === 2)
    .forEach((proposal, index) => {
      const project = projects.find((item) => item._id === proposal.projectId);
      if (!project) return;
      const fee = Math.round(proposal.price * PLATFORM_FEE_RATE);
      ledger.push({
        id: objectId(7000 + index * 2),
        kind: "escrow-in",
        status: "settled",
        amount: proposal.price,
        fee,
        projectId: project._id,
        projectTitle: project.title,
        counterpartyName: project.owner.name,
        createdAt: proposal.createdAt as string,
      });
      const settled = index % 3 !== 0;
      ledger.push({
        id: objectId(7001 + index * 2),
        kind: settled ? "payout" : "escrow-release",
        status: settled ? "settled" : "pending",
        amount: proposal.price - fee,
        projectId: project._id,
        projectTitle: project.title,
        counterpartyName: (proposal.user as User).name,
        createdAt: daysAgo(now, intBetween(rng, 0, 40), 12),
      });
    });

  return { reviews, ledger };
}

export function createDemoState(now: Date = new Date()): DemoState {
  idCounter = 0;
  const rng = createRng(20240517);

  const categories: Category[] = CATEGORY_SEED.map((seed, index) => ({
    _id: objectId(index),
    title: seed.title,
    englishTitle: seed.englishTitle,
    icon: seed.icon,
    description: `پروژه‌های دستهٔ ${seed.title}`,
  }));

    const users = seedUsers(now, rng);
  const { projects, proposals } = seedProjectsAndProposals(now, rng, categories, users);
  const { reviews, ledger } = seedReviewsAndLedger(now, rng, projects, proposals);
  const demoFreelancer = users[2];
  const demoOwner = users[1];

  /* ---------------------------- notifications -------------------------- */
  const notifications: AppNotification[] = [
    {
      id: objectId(8000),
      kind: "proposal.created",
      titleKey: "notifications.seed.proposalCreated.title",
      bodyKey: "notifications.seed.proposalCreated.body",
      params: { project: projects[0].title },
      href: "/owner/projects",
      createdAt: daysAgo(now, 0, 10),
      read: false,
      severity: "info",
    },
    {
      id: objectId(8001),
      kind: "proposal.accepted",
      titleKey: "notifications.seed.proposalAccepted.title",
      bodyKey: "notifications.seed.proposalAccepted.body",
      params: { project: projects[1].title },
      href: "/freelancer/proposals",
      createdAt: daysAgo(now, 1, 14),
      read: false,
      severity: "success",
    },
    {
      id: objectId(8002),
      kind: "ledger.entry",
      titleKey: "notifications.seed.ledger.title",
      bodyKey: "notifications.seed.ledger.body",
      href: "/freelancer/wallet",
      createdAt: daysAgo(now, 2, 16),
      read: true,
      severity: "info",
    },
    {
      id: objectId(8003),
      kind: "system",
      titleKey: "notifications.seed.system.title",
      bodyKey: "notifications.seed.system.body",
      href: "/settings",
      createdAt: daysAgo(now, 4, 11),
      read: true,
      severity: "warning",
    },
  ];

  /* ---------------------------- conversations -------------------------- */
  const conversations: Conversation[] = [
    {
      id: objectId(8500),
      projectId: projects[0]._id,
      title: projects[0].title,
      participantIds: [demoOwner._id, demoFreelancer._id],
      unread: 2,
      messages: [
        {
          id: objectId(8600),
          authorId: demoOwner._id,
          authorName: demoOwner.name,
          body: "سلام! پیشنهاد شما را دیدم. امکان شروع از هفتهٔ آینده هست؟",
          createdAt: daysAgo(now, 2, 9),
        },
        {
          id: objectId(8601),
          authorId: demoFreelancer._id,
          authorName: demoFreelancer.name,
          body: "سلام، بله. اگر قرارداد نهایی شود، دوشنبه شروع می‌کنم و در پایان هفتهٔ اول نسخهٔ اولیه را تحویل می‌دهم.",
          createdAt: daysAgo(now, 2, 11),
        },
        {
          id: objectId(8602),
          authorId: demoOwner._id,
          authorName: demoOwner.name,
          body: "عالی. لطفاً فایل توکن‌های طراحی را هم در برنامه بگنجانید.",
          createdAt: daysAgo(now, 1, 15),
        },
      ],
    },
    {
      id: objectId(8501),
      projectId: projects[3]._id,
      title: projects[3].title,
      participantIds: [demoOwner._id, users[6]._id],
      unread: 0,
      messages: [
        {
          id: objectId(8603),
          authorId: users[6]._id,
          authorName: users[6].name,
          body: "درخواست دسترسی به مخزن کد را ارسال کردم.",
          createdAt: daysAgo(now, 6, 13),
        },
      ],
    },
  ];

  /* -------------------------------- audit ------------------------------ */
  const audit: AuditEntry[] = [
    {
      id: objectId(8800),
      actorName: "سیستم",
      actionKey: "audit.seed.projectCreated",
      entity: "project",
      entityLabel: projects[0].title,
      at: projects[0].createdAt,
      source: "remote",
    },
    {
      id: objectId(8801),
      actorName: "نیما سلطانی",
      actionKey: "audit.seed.userVerified",
      entity: "user",
      entityLabel: users[5].name,
      at: daysAgo(now, 3, 12),
      source: "remote",
    },
    {
      id: objectId(8802),
      actorName: "امیرحسین کاظمی",
      actionKey: "audit.seed.proposalSubmitted",
      entity: "proposal",
      entityLabel: projects[1].title,
      at: daysAgo(now, 1, 17),
      source: "remote",
    },
  ];

  return {
    version: 1,
    users,
    categories,
    projects,
    proposals,
    reviews,
    ledger,
    notifications,
    conversations,
    audit,
    sessionUserId: null,
    pendingOtp: null,
  };
}
