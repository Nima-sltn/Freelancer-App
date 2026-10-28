import type { IconType } from "react-icons";
import {
  IconBoard,
  IconChart,
  IconChat,
  IconClipboard,
  IconCollection,
  IconDocument,
  IconGrid,
  IconHome,
  IconPalette,
  IconSettings,
  IconShield,
  IconStar,
  IconUsers,
  IconWallet,
} from "./icons";
import type { IconName } from "@/types";

/**
 * The icon registry: data layers store an {@link IconName}, the UI resolves it
 * here. Navigation, the mobile drawer and the command palette therefore carry
 * plain strings — `config/` never imports a React component — and adding a nav
 * item means adding a key. A missing key falls back to the grid glyph rather
 * than rendering nothing.
 */
export const ICONS: Record<IconName, IconType> = {
  home: IconHome,
  grid: IconGrid,
  clipboard: IconClipboard,
  board: IconBoard,
  users: IconUsers,
  collection: IconCollection,
  shield: IconShield,
  chart: IconChart,
  document: IconDocument,
  wallet: IconWallet,
  star: IconStar,
  chat: IconChat,
  settings: IconSettings,
  palette: IconPalette,
};

/**
 * Key → glyph component.
 *
 * Keeps the configuration layer free of JSX and of any import into
 * `components/`, and guarantees one icon family across the product: there is
 * exactly one registry.
 */
export function IconFor({ name }: { name: IconName }) {
  const Glyph = ICONS[name] ?? ICONS.grid;
  return <Glyph />;
}

export default IconFor;
