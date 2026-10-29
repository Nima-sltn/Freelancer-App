import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  authService,
  projectService,
  proposalService,
  categoryService,
  userService,
} from "@/services";

export interface ServiceRegistry {
  auth: typeof authService;
  projects: typeof projectService;
  proposals: typeof proposalService;
  categories: typeof categoryService;
  users: typeof userService;
}

const defaultServices: ServiceRegistry = {
  auth: authService,
  projects: projectService,
  proposals: proposalService,
  categories: categoryService,
  users: userService,
};

const ServiceContext = createContext<ServiceRegistry>(defaultServices);

export interface ServiceProviderProps {
  readonly children: ReactNode;
  /** Custom services override for testing or mocked environments */
  readonly overrides?: Partial<ServiceRegistry>;
}

/**
 * Dependency Injection Service Container Provider.
 *
 * Provides swappable service instances throughout the application. Enables
 * hermetic testing and clean dependency inversion without prop drilling.
 */
export function ServiceProvider({ children, overrides }: Readonly<ServiceProviderProps>) {
  const services = useMemo<ServiceRegistry>(() => {
    if (!overrides) return defaultServices;
    return {
      ...defaultServices,
      ...overrides,
    };
  }, [overrides]);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}

/**
 * Access a typed domain service from the Dependency Injection container.
 *
 * @example
 * const projectService = useService("projects");
 * const projects = await projectService.getProjects();
 */
export function useService<K extends keyof ServiceRegistry>(
  key: K
): ServiceRegistry[K] {
  const container = useContext(ServiceContext);
  return container[key];
}

/**
 * Access all registered services from the Dependency Injection container.
 */
export function useServices(): ServiceRegistry {
  return useContext(ServiceContext);
}

export default ServiceProvider;
