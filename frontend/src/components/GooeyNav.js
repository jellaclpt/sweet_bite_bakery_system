import { useRef, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/GooeyEffects.css";

// Reusable gooey effect hook that can be used by any navigation / menu
export const useGooeyEffect = ({
  animationTime = 600,
  particleCount = 15,
  particleDistances = [60, 10],
  particleR = 80,
  timeVariance = 300,
  colors = [1, 2, 3, 4],
} = {}) => {
  const containerRef = useRef(null);
  const filterRef = useRef(null);
  const textRef = useRef(null);

  // Small helper math for animation
  const noise = (n = 1) => n / 2 - Math.random() * n;
  const getXY = (distance, pointIndex, totalPoints) => {
    const angle =
      ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i, t, d, r) => {
    let rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10,
    };
  };

  const makeParticles = (element) => {
    if (!element) return;
    const d = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty("--time", `${bubbleTime}ms`);
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      setTimeout(() => {
        const particle = document.createElement("span");
        const point = document.createElement("span");
        particle.classList.add("particle");
        particle.style.setProperty("--start-x", `${p.start[0]}px`);
        particle.style.setProperty("--start-y", `${p.start[1]}px`);
        particle.style.setProperty("--end-x", `${p.end[0]}px`);
        particle.style.setProperty("--end-y", `${p.end[1]}px`);
        particle.style.setProperty("--time", `${p.time}ms`);
        particle.style.setProperty("--scale", `${p.scale}`);
        particle.style.setProperty("--color", `var(--color-${p.color}, white)`);
        particle.style.setProperty("--rotate", `${p.rotate}deg`);
        point.classList.add("point");
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => {
          element.classList.add("active");
        });
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch {}
        }, t);
      }, 30);
    }
  };

  const updateEffectPosition = (element, labelText) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    if (!element) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`,
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText =
      typeof labelText === "string" && labelText.length
        ? labelText
        : element.innerText;
  };

  // Public API for consumers
  const moveToElement = (element, labelText) => {
    updateEffectPosition(element, labelText);
    if (textRef.current) {
      textRef.current.classList.add("active");
    }
  };

  const triggerAtElement = (element, labelText) => {
    if (!element) return;

    updateEffectPosition(element, labelText);

    if (filterRef.current) {
      const particles = filterRef.current.querySelectorAll(".particle");
      particles.forEach((p) => filterRef.current.removeChild(p));
    }

    if (textRef.current) {
      textRef.current.classList.remove("active");
      // force reflow to restart CSS animation
      // eslint-disable-next-line no-unused-expressions
      void textRef.current.offsetWidth;
      textRef.current.classList.add("active");
    }

    if (filterRef.current) {
      makeParticles(filterRef.current);
    }
  };

  return {
    containerRef,
    filterRef,
    textRef,
    moveToElement,
    triggerAtElement,
  };
};

const GooeyNav = ({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [60, 10],
  particleR = 80,
  timeVariance = 300,
  colors = [1, 2, 3, 4],
}) => {
  const navRef = useRef(null);
  const {
    containerRef,
    filterRef,
    textRef,
    moveToElement,
    triggerAtElement,
  } = useGooeyEffect({
    animationTime,
    particleCount,
    particleDistances,
    particleR,
    timeVariance,
    colors,
  });
  const navigate = useNavigate();
  const location = useLocation();

  const [activeIndex, setActiveIndex] = useState(0);

  // ✅ Keep highlight synced with current route
  useEffect(() => {
    const currentIndex = items.findIndex((item) => item.href === location.pathname);
    // Pages outside the nav (e.g. Profile) highlight nothing instead of keeping the last tab
    setActiveIndex(currentIndex);
    [filterRef.current, textRef.current].forEach((el) => {
      if (el) el.style.opacity = currentIndex === -1 ? "0" : "";
    });
    if (currentIndex !== -1) {
      const li = navRef.current?.querySelectorAll("li")[currentIndex];
      if (li) moveToElement(li, items[currentIndex]?.label);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, items]);

  const handleClick = (e, index, href) => {
    const liEl = e.currentTarget;
    if (activeIndex === index) return;
    setActiveIndex(index);
    triggerAtElement(liEl, items[index]?.label);
    navigate(href);
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current || activeIndex === -1) return;
    const activeLi = navRef.current.querySelectorAll("li")[activeIndex];
    if (activeLi) {
      moveToElement(activeLi, items[activeIndex]?.label);
      textRef.current?.classList.add("active");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
      <div className="relative flex justify-center" ref={containerRef}>
        <nav className="flex relative">
          <ul
            ref={navRef}
            className="flex gap-6 list-none m-0 p-0 relative z-[3] text-gray-700 font-medium"
          >
            {items.map((item, index) => (
              <li
                key={index}
                onClick={(e) => handleClick(e, index, item.href)}
                className={`relative cursor-pointer py-2 px-4 rounded-full transition duration-300 flex items-center gap-1 ${
                  activeIndex === index
                    ? "bg-white shadow-md"
                    : ""
                }`}
                style={{
                  color: activeIndex === index ? "#974D07" : "inherit",
                }}
                onMouseEnter={(e) => activeIndex !== index && (e.currentTarget.style.backgroundColor = "#f0e6dd", e.currentTarget.style.color = "#974D07")}
                onMouseLeave={(e) => activeIndex !== index && (e.currentTarget.style.backgroundColor = "transparent", e.currentTarget.style.color = "inherit")}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </nav>

        <span className="effect filter" ref={filterRef}></span>
        <span className="effect text" ref={textRef}></span>
      </div>
  );
};

export default GooeyNav;
