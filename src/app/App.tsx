import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { AppRouter } from "./router/AppRouter";

/**
 * Application root.
 *
 * Intentionally tiny: providers + router. Anything that needs to live above a
 * route (theme, i18n, cache, command palette) belongs to `AppProviders`, and
 * anything that belongs to a layout belongs to the router's element tree.
 */
export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </BrowserRouter>
  );
}

export default App;
