import { Link, useLocation } from "react-router-dom";
import { bubbleBurst } from "./bubbleBurst";

// Customer top navigation.
// Active tab: white pill with a soft warm glow. Hover: light brown pill and a gentle zoom.
// Click: the same bubbly burst as the admin sidebar.
// Styles come only from classes, so nothing is left behind after hovering or clicking.
const base =
  "relative flex items-center gap-1.5 py-2 px-4 rounded-full font-medium transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";
const activeStyle = "bg-white text-brand shadow-[0_0_16px_rgba(151,77,7,0.45)]";
const idleStyle = "text-gray-700 hover:bg-sand hover:text-brand hover:scale-[1.04]";

export default function GooeyNav({ items }) {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Main">
      <ul className="flex gap-4 list-none m-0 p-0">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                to={item.href}
                aria-current={active ? "page" : undefined}
                className={`${base} ${active ? activeStyle : idleStyle}`}
                onClick={(e) => !active && bubbleBurst(e.currentTarget)}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
