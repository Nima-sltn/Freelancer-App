import DarkModeToggle from "./DarkModeToggle";
import Logout from "../features/authentication/Logout";

function HeaderMenu() {
  return (
    <ul className="flex items-center gap-x-4">
      <li>
        <DarkModeToggle />
      </li>
      <li>
        <Logout />
      </li>
    </ul>
  );
}

export default HeaderMenu;
