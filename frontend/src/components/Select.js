// Sweet Bite dropdown, used instead of the browser's default <select> (whose open menu
// can't be styled). Works with mouse, touch and keyboard:
//   Enter / Space / Arrow keys open it, arrows move, Enter picks, Escape closes,
//   Home / End jump, and typing a letter jumps to the first option starting with it.
//
// onChange receives { target: { name, value } }, like a normal input event, so existing
// handlers such as handleChange(e) keep working.
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 260;

export default function Select({
  value,
  onChange,
  options,
  name,
  placeholder = "Select…",
  required = false,
  disabled = false,
  size = "md",
  className = "",
  "aria-label": ariaLabel,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [menuStyle, setMenuStyle] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const typed = useRef({ text: "", timer: null });
  const listId = useId();
  const buttonId = id || `${listId}-button`;

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value ?? ""));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const showPlaceholder = !selected || (selected.value === "" && !selected.label);

  // Place the menu under the button (or above it when there isn't room below).
  // It's rendered in <body> so tables, modals and scroll areas can't cut it off.
  const placeMenu = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - MENU_GAP;
    const above = rect.top - MENU_GAP;
    const openUp = below < Math.min(MENU_MAX_HEIGHT, 160) && above > below;
    setMenuStyle({
      left: rect.left,
      width: Math.max(rect.width, 160),
      maxHeight: Math.min(MENU_MAX_HEIGHT, (openUp ? above : below) - 8),
      ...(openUp ? { bottom: window.innerHeight - rect.top + MENU_GAP } : { top: rect.bottom + MENU_GAP }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
    const onMove = () => placeMenu();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, placeMenu]);

  // Close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!buttonRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Keep the highlighted option scrolled into view
  useEffect(() => {
    if (!open || highlight < 0) return;
    menuRef.current?.querySelector(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  const isPickable = (i) => i >= 0 && i < options.length && !options[i].disabled;

  const step = (from, dir) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) {
      if (isPickable(i)) return i;
    }
    return from;
  };

  const openMenu = () => {
    if (disabled) return;
    setHighlight(isPickable(selectedIndex) ? selectedIndex : step(-1, 1));
    setOpen(true);
  };

  const pick = (i) => {
    if (!isPickable(i)) return;
    setOpen(false);
    buttonRef.current?.focus();
    if (String(options[i].value) !== String(value ?? "")) {
      onChange?.({ target: { name, value: options[i].value } });
    }
  };

  const jumpToLetter = (key) => {
    clearTimeout(typed.current.timer);
    typed.current.text += key.toLowerCase();
    typed.current.timer = setTimeout(() => (typed.current.text = ""), 600);
    const match = options.findIndex(
      (o, i) => isPickable(i) && String(o.label).toLowerCase().startsWith(typed.current.text)
    );
    if (match >= 0) {
      if (open) setHighlight(match);
      else pick(match);
    }
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openMenu();
        else setHighlight((h) => step(h, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openMenu();
        else setHighlight((h) => step(h, -1));
        break;
      case "Home":
        if (open) { e.preventDefault(); setHighlight(step(-1, 1)); }
        break;
      case "End":
        if (open) { e.preventDefault(); setHighlight(step(options.length, -1)); }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) pick(highlight);
        else openMenu();
        break;
      case "Escape":
        if (open) { e.preventDefault(); setOpen(false); }
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) jumpToLetter(e.key);
    }
  };

  const sizes = size === "sm" ? "px-3 py-1.5 text-sm rounded-lg" : "px-3.5 py-2.5 text-sm rounded-xl";

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && highlight >= 0 ? `${listId}-${highlight}` : undefined}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`w-full flex items-center justify-between gap-2 border bg-white text-left transition outline-none ${sizes} ${
          open ? "border-brand ring-4 ring-brand/15" : "border-line hover:border-brand/50 focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`truncate ${showPlaceholder ? "text-gray-400" : "text-gray-800"}`}>
          {showPlaceholder ? placeholder : selected.label}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-brand transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Keeps the browser's "please fill out this field" check working in forms */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          value={value ?? ""}
          required
          onChange={() => {}}
          onFocus={() => buttonRef.current?.focus()}
          className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none"
        />
      )}

      {open &&
        menuStyle &&
        createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-labelledby={buttonId}
            style={{ position: "fixed", ...menuStyle }}
            className="z-[80] overflow-auto bg-white border border-line rounded-xl shadow-lg shadow-brand-deep/10 p-1 font-sans animate-dropdown-in"
          >
            {options.map((opt, i) => {
              const isSelected = i === selectedIndex;
              const isHighlighted = i === highlight;
              return (
                <li
                  key={`${opt.value}-${i}`}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  onMouseEnter={() => isPickable(i) && setHighlight(i)}
                  onMouseDown={(e) => e.preventDefault()} // keep focus on the button
                  onClick={() => pick(i)}
                  className={`flex items-center justify-between gap-3 px-3 py-2 text-sm rounded-lg select-none ${
                    opt.disabled
                      ? "text-gray-400 cursor-default"
                      : isHighlighted
                      ? "bg-sand text-brand-deep cursor-pointer"
                      : "text-gray-700 cursor-pointer"
                  } ${isSelected ? "font-semibold text-brand" : ""}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={15} className="shrink-0 text-brand" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
