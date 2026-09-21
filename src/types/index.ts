// ===== User Types =====
export type UserRole = "OWNER" | "FREELANCER" | "ADMIN";
export type UserStatus = 0 | 1 | 2;

export interface User {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ===== Category Types =====
export interface Category {
  _id: string;
  title: string;
  englishTitle: string;
  description?: string;
}

export interface CategoryOption {
  label: string;
  value: string;
}

// ===== Project Types =====
export type ProjectStatus = "OPEN" | "CLOSED";

export interface Project {
  _id: string;
  title: string;
  description: string;
  budget: number;
  deadline: string;
  tags: string[];
  status: ProjectStatus;
  category: {
    _id: string;
    title: string;
  };
  freelancer?: User;
  owner?: User;
  proposals: Proposal[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProjectData {
  title: string;
  description: string;
  budget: number;
  deadline: string;
  tags: string[];
  category: string;
}

export interface EditProjectData {
  editId: string;
  newProject: CreateProjectData;
}

// ===== Proposal Types =====
export type ProposalStatus = 0 | 1 | 2;

export interface Proposal {
  _id: string;
  description: string;
  price: number;
  duration: number;
  status: ProposalStatus;
  user: User;
  project?: Project;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProposalData {
  description: string;
  price: number;
  duration: number;
  projectId: string;
}

// ===== API Response Types =====
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface AuthResponse {
  message: string;
  user?: User;
}

export interface OtpResponse {
  message: string;
}

// ===== Query Types =====
export interface ProjectsQueryResponse {
  projects: Project[];
}

export interface ProposalsQueryResponse {
  proposals: Proposal[];
}

export interface UsersQueryResponse {
  users: User[];
}

export interface CategoriesQueryResponse {
  categories: Category[];
}

// ===== Component Prop Types =====
export interface StatusStyle {
  label: string;
  className: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupConfig {
  name: string;
  validationSchema?: Record<string, unknown>;
  options: RadioOption[];
}

// ===== Axios Interceptor Config =====
declare module "axios" {
  interface AxiosRequestConfig {
    _retry?: boolean;
  }
}
