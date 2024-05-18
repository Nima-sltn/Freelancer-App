import { HiCollection, HiHome } from "react-icons/hi";
import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <div className="bg-secondary-0 row-start-1 row-span-2 border-l border-gray-200 p-4">
      <ul className="flex flex-col gap-y-4">
        <li>
          <CustomNavlink to="/owner/dashboard">
            <HiHome />
            <span>داشبورد</span>
          </CustomNavlink>
        </li>
        <li>
          <CustomNavlink to="/owner/projects">
            <HiCollection />
            <span>پروژه ها</span>
          </CustomNavlink>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;

function CustomNavlink({ children, to }) {
  const navlinkClass =
    "flex items-center gap-x-2 hover:text-primary-900 px-2 py-1.5 rounded-lg  transition-all duration-200";

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive
          ? `${navlinkClass} bg-primary-300/50 text-primary-900`
          : `${navlinkClass} text-secondary-600 hover:bg-primary-100/50`
      }>
      {children}
    </NavLink>
  );
}
