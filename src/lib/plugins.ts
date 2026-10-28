/**
 * Pure TypeScript Plugin and Extension Architecture (Layer 1).
 *
 * Defines plugin interfaces, lifecycle hooks, and an in-memory registry.
 * Free of React and UI dependencies, fully testable and headless.
 */

export type PluginHookName =
  | "app:init"
  | "transaction:beforeRun"
  | "transaction:afterCommit"
  | "transaction:afterRollback"
  | "proposal:beforeSubmit"
  | "proposal:afterSubmit"
  | "project:beforeCreate"
  | "project:afterCreate"
  | "metrics:computed"
  | "vitals:metric";

export type PluginHookHandler<T = unknown, R = unknown> = (
  payload: T
) => Promise<R> | R | void;

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled?: boolean;
  hooks?: Partial<Record<PluginHookName, PluginHookHandler<any, any>>>;
  metadata?: Record<string, unknown>;
}

export class PluginRegistry {
  private plugins = new Map<string, PluginDefinition>();
  private hookListeners = new Map<PluginHookName, Set<PluginHookHandler<any, any>>>();

  constructor() {
    this.registerBuiltInPlugins();
  }

  register(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.id)) {
      this.unregister(plugin.id);
    }

    const resolved: PluginDefinition = {
      ...plugin,
      enabled: plugin.enabled ?? true,
    };

    this.plugins.set(resolved.id, resolved);

    if (resolved.enabled && resolved.hooks) {
      Object.entries(resolved.hooks).forEach(([hookName, handler]) => {
        if (handler) {
          this.addHookListener(hookName as PluginHookName, handler);
        }
      });
    }
  }

  unregister(id: string): boolean {
    const existing = this.plugins.get(id);
    if (!existing) return false;

    if (existing.hooks) {
      Object.entries(existing.hooks).forEach(([hookName, handler]) => {
        if (handler) {
          this.removeHookListener(hookName as PluginHookName, handler);
        }
      });
    }

    return this.plugins.delete(id);
  }

  enable(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin || plugin.enabled) return false;
    plugin.enabled = true;
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
        if (handler) this.addHookListener(hookName as PluginHookName, handler);
      });
    }
    return true;
  }

  disable(id: string): boolean {
    const plugin = this.plugins.get(id);
    if (!plugin || !plugin.enabled) return false;
    plugin.enabled = false;
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
        if (handler) this.removeHookListener(hookName as PluginHookName, handler);
      });
    }
    return true;
  }

  getPlugin(id: string): PluginDefinition | undefined {
    return this.plugins.get(id);
  }

  getPlugins(): PluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  addHookListener(hookName: PluginHookName, handler: PluginHookHandler<any, any>): () => void {
    if (!this.hookListeners.has(hookName)) {
      this.hookListeners.set(hookName, new Set());
    }
    this.hookListeners.get(hookName)!.add(handler);
    return () => this.removeHookListener(hookName, handler);
  }

  removeHookListener(hookName: PluginHookName, handler: PluginHookHandler<any, any>): void {
    this.hookListeners.get(hookName)?.delete(handler);
  }

  async runHook<T = unknown>(hookName: PluginHookName, payload: T): Promise<T> {
    const listeners = this.hookListeners.get(hookName);
    if (!listeners || listeners.size === 0) return payload;

    let current = payload;
    for (const handler of Array.from(listeners)) {
      try {
        const result = await handler(current);
        if (result !== undefined) {
          current = result as T;
        }
      } catch (err) {
        // Plugin failure must never break core application flow
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.warn(`[PluginRegistry] Hook '${hookName}' failed:`, err);
        }
      }
    }

    return current;
  }

  runHookSync<T = unknown>(hookName: PluginHookName, payload: T): T {
    const listeners = this.hookListeners.get(hookName);
    if (!listeners || listeners.size === 0) return payload;

    let current = payload;
    listeners.forEach((handler) => {
      try {
        const result = handler(current);
        if (result !== undefined && !(result instanceof Promise)) {
          current = result as T;
        }
      } catch (err) {
        if (typeof console !== "undefined") {
          // eslint-disable-next-line no-console
          console.warn(`[PluginRegistry] Sync hook '${hookName}' failed:`, err);
        }
      }
    });

    return current;
  }

  private registerBuiltInPlugins(): void {
    // 1. Transaction audit log plugin
    this.register({
      id: "builtin-audit-logger",
      name: "ثبت‌کننده وقایع تراکنش",
      version: "1.0.0",
      description: "ثبت خودکار تراکنش‌های موفق و ناموفق در گزارشات محلی",
      enabled: true,
      hooks: {
        "transaction:afterCommit": (payload) => {
          // Can record telemetry or audit events
          return payload;
        },
      },
    });

    // 2. Performance monitor plugin
    this.register({
      id: "builtin-telemetry",
      name: "ناظر عملکرد و تله‌متری",
      version: "1.0.0",
      description: "اندازه‌گیری زمان پاسخ‌دهی و پردازش دستورات",
      enabled: true,
    });
  }
}

export const pluginRegistry = new PluginRegistry();
export default pluginRegistry;
