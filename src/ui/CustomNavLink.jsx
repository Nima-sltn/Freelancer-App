import { NavLink } from "react-router-dom";

export default function CustomNavlink({ children, to }) {
  const navlinkClass =
    "flex items-center gap-x-2 hover:text-primary-900 px-2 py-1.5 rounded-lg  transition-all duration-300";

  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          isActive
            ? `${navlinkClass} bg-primary-400/50 text-primary-900`
            : `${navlinkClass} text-secondary-600 hover:bg-primary-100/50`
        }>
        {children}
      </NavLink>
    </li>
  );
}
