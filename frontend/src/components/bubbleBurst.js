// Bubbly click effect: brand-colored bubbles burst out of the clicked element,
// and the element does a quick squish-and-bounce "pop".
// Skipped for people who've asked their device to reduce motion.
import "../styles/BubbleBurst.css";

const COLORS = ["#F3C99A", "#E8B98A", "#D48A32", "#FFF8F0", "#C68B59"];

export function bubbleBurst(element, { count = 14 } = {}) {
  if (!element) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  // Restart the pop even on quick repeated clicks
  element.classList.remove("bubble-pop");
  void element.offsetWidth; // force reflow so the animation replays
  element.classList.add("bubble-pop");

  const rect = element.getBoundingClientRect();
  const layer = document.createElement("span");
  layer.className = "bubble-layer";
  // Fixed to the page so bubbles aren't clipped by the sidebar or its scrolling
  Object.assign(layer.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const bubble = document.createElement("span");
    bubble.className = "bubble";

    // Spread around the pill: wider sideways than up and down, like the pill's shape
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const distance = 28 + Math.random() * 34;
    const size = 6 + Math.random() * 9;

    bubble.style.setProperty("--x", `${Math.cos(angle) * distance * 1.6}px`);
    bubble.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
    bubble.style.setProperty("--size", `${size}px`);
    bubble.style.setProperty("--color", COLORS[i % COLORS.length]);
    bubble.style.setProperty("--delay", `${Math.random() * 60}ms`);
    bubble.style.setProperty("--duration", `${550 + Math.random() * 250}ms`);
    // Start somewhere along the pill, not all from one point
    bubble.style.left = `${15 + Math.random() * 70}%`;

    layer.appendChild(bubble);
  }

  setTimeout(() => layer.remove(), 1000);
  setTimeout(() => element.classList.remove("bubble-pop"), 500);
}
