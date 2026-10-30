// Shared split layout for the Login and Register pages:
// a bakery photo panel on the left and the form on the right.
import React, { useState } from "react";
import { Clock, CalendarCheck, Truck, Eye, EyeOff } from "lucide-react";
import logo from "../assets/logo.png";
import cakesBg from "../assets/cakes-bg.jpg";

const PERKS = [
  { icon: CalendarCheck, text: "Pre-order cakes, breads and pastries" },
  { icon: Clock, text: "Pick the exact date and time that suits you" },
  { icon: Truck, text: "Collect in store or have it delivered" },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex bg-cream">
      {/* Photo panel (desktop and tablet) */}
      <aside
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-cover bg-center"
        style={{ backgroundImage: `url(${cakesBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#2b1608]/95 via-[#2b1608]/60 to-[#2b1608]/30" />
        <div className="relative z-10 flex flex-col justify-between w-full p-12 text-white">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="w-12 h-12 rounded-full bg-white/90" />
            <span className="text-2xl font-semibold">Sweet Bite</span>
          </div>

          <div className="max-w-md">
            <p className="text-sm uppercase tracking-[0.2em] text-[#F3C99A] mb-3">Bakery pre-orders</p>
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
              Freshly baked, made just for you.
            </h2>
            <ul className="space-y-3">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-white/85">
                  <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-white/60">© {new Date().getFullYear()} Sweet Bite Bakery</p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex flex-col">
        {/* Slim photo banner on phones, where the side panel is hidden */}
        <div
          className="lg:hidden h-40 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${cakesBg})` }}
        >
          <div className="absolute inset-0 bg-[#2b1608]/55" />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md -mt-24 lg:mt-0 bg-white lg:bg-transparent rounded-2xl shadow-lg lg:shadow-none p-6 sm:p-8 lg:p-0">
            <img src={logo} alt="Sweet Bite Logo" className="w-14 h-14 mb-5 lg:hidden mx-auto" />
            <h1 className="text-3xl font-bold text-brand-deep">{title}</h1>
            {subtitle && <p className="text-gray-500 mt-1 mb-8">{subtitle}</p>}
            {children}
            {footer && <div className="mt-6 text-sm text-gray-500 text-center">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}

// Text input with a leading icon. Password fields get a show/hide toggle.
export function AuthField({ label, icon: Icon, type = "text", ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      <span className="relative block">
        {Icon && (
          <Icon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        )}
        <input
          type={isPassword && visible ? "text" : type}
          className={`w-full rounded-xl border border-line bg-white py-3 ${Icon ? "pl-11" : "pl-4"} ${
            isPassword ? "pr-11" : "pr-4"
          } text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </span>
    </label>
  );
}
