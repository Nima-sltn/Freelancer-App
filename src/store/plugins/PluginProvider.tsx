import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  pluginRegistry,
  type PluginDefinition,
  type PluginHookName,
  type PluginHookHandler,
} from "@/lib/plugins";

interface PluginContextValue {
  readonly plugins: readonly PluginDefinition[];
  readonly enablePlugin: (id: string) => void;
  readonly disablePlugin: (id: string) => void;
  readonly registerPlugin: (plugin: PluginDefinition) => void;
  readonly unregisterPlugin: (id: string) => void;
}

const PluginContext = createContext<PluginContextValue | null>(null);

export interface PluginProviderProps {
  readonly children: ReactNode;
}

/**
 * React Context provider for the Plugin/Extension system.
 */
export function PluginProvider({ children }: Readonly<PluginProviderProps>) {
  const [plugins, setPlugins] = useState<PluginDefinition[]>(() =>
    pluginRegistry.getPlugins()
  );

  const refresh = useCallback(() => {
    setPlugins([...pluginRegistry.getPlugins()]);
  }, []);

  const enablePlugin = useCallback(
    (id: string) => {
      pluginRegistry.enable(id);
      refresh();
    },
    [refresh]
  );

  const disablePlugin = useCallback(
    (id: string) => {
      pluginRegistry.disable(id);
      refresh();
    },
    [refresh]
  );

  const registerPlugin = useCallback(
    (plugin: PluginDefinition) => {
      pluginRegistry.register(plugin);
      refresh();
    },
    [refresh]
  );

  const unregisterPlugin = useCallback(
    (id: string) => {
      pluginRegistry.unregister(id);
      refresh();
    },
    [refresh]
  );

  const contextValue = useMemo(
    () => ({
      plugins,
      enablePlugin,
      disablePlugin,
      registerPlugin,
      unregisterPlugin,
    }),
    [plugins, enablePlugin, disablePlugin, registerPlugin, unregisterPlugin]
  );

  return (
    <PluginContext.Provider value={contextValue}>
      {children}
    </PluginContext.Provider>
  );
}

/**
 * Access the plugin manager.
 */
export function usePlugins() {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error("usePlugins must be used within a PluginProvider");
  }
  return context;
}

/**
 * Subscribes to a plugin hook within a component's lifecycle.
 */
export function usePluginHook<T = unknown, R = unknown>(
  hookName: PluginHookName,
  handler: PluginHookHandler<T, R>
) {
  useEffect(() => {
    const cleanup = pluginRegistry.addHookListener(hookName, handler);
    return cleanup;
  }, [hookName, handler]);
}

export default PluginProvider;
