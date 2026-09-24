"use client";

import { useEffect, useRef } from "react";
import Icon from "./Icon";
import { dogById, img } from "../lib/data";

export function Avatar({ src, id, size = 40, ring, online, square, alt = "" }) {
  const photo = src || dogById(id)?.photo;
  return (
    <span className={"avatar" + (ring ? " ring ring-" + ring : "") + (square ? " square" : "")} style={{ "--s": size + "px" }}>
      {photo && <img src={img(photo, Math.max(80, size * 2), Math.max(80, size * 2))} alt={alt} loading="lazy" />}
      {online !== undefined && <i className={"presence" + (online ? " on" : "")} />}
    </span>
  );
}

export function AvatarStack({ ids = [], size = 24, max = 3 }) {
  return (
    <span className="avatarStack" style={{ "--s": size + "px" }}>
      {ids.slice(0, max).map((id) => (
        <Avatar key={id} id={id} size={size} />
      ))}
    </span>
  );
}

export function SectionHead({ title, action, onAction, kicker, children }) {
  return (
    <div className="sectionHead">
      <div>
        {kicker && <span className="kicker">{kicker}</span>}
        <h2>{title}</h2>
      </div>
      {children}
      {action && (
        <button className="linkish" onClick={onAction}>
          {action} <Icon name="arrowRight" size={15} />
        </button>
      )}
    </div>
  );
}

export function Chips({ items, value, onChange, icons }) {
  return (
    <div className="chips" role="tablist">
      {items.map((it) => {
        const id = typeof it === "string" ? it : it.id;
        const label = typeof it === "string" ? it : it.label;
        const icon = typeof it === "string" ? icons?.[it] : it.icon;
        return (
          <button key={id} role="tab" aria-selected={value === id} className={value === id ? "active" : ""} onClick={() => onChange(id)}>
            {icon && <Icon name={icon} size={16} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Meter({ value, max = 5, label }) {
  return (
    <span className="meter" title={label}>
      {Array.from({ length: max }).map((_, i) => (
        <i key={i} className={i < value ? "on" : ""} />
      ))}
    </span>
  );
}

export function Bar({ value, max = 100, tone = "blue" }) {
  return (
    <div className={"bar tone-" + tone}>
      <i style={{ width: Math.min(100, (value / max) * 100) + "%" }} />
    </div>
  );
}

// Felles ramme for modaler, skuffer og bunnark. Lukk med Esc eller klikk på bakgrunnen.
export function Layer({ kind = "modal", onClose, className = "", children, label, tone }) {
  const closeRef = useRef(onClose);
  const rootRef = useRef(null);
  closeRef.current = onClose;
  useEffect(() => {
    // Esc lukker bare det øverste laget.
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const all = document.querySelectorAll(".layer");
      if (all[all.length - 1] === rootRef.current) closeRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div ref={rootRef} className={"layer layer-" + kind + (tone ? " tone-" + tone : "")} onClick={onClose}>
      <div className={"layerBox " + className} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

export function CloseBtn({ onClick, light }) {
  return (
    <button className={"closeBtn" + (light ? " light" : "")} onClick={onClick} aria-label="Lukk">
      <Icon name="x" size={18} />
    </button>
  );
}

export function LayerHead({ kicker, title, onClose }) {
  return (
    <div className="layerHead">
      <div>
        {kicker && <span className="kicker">{kicker}</span>}
        <h2>{title}</h2>
      </div>
      <CloseBtn onClick={onClose} />
    </div>
  );
}

export function RouteSketch({ path = "M10 70 C 30 20, 60 80, 90 25", className = "" }) {
  return (
    <svg viewBox="0 0 100 90" className={"routeSketch " + className} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="mapgrid" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" fill="none" stroke="rgba(32,35,111,.07)" strokeWidth=".6" />
        </pattern>
      </defs>
      <rect width="100" height="90" fill="url(#mapgrid)" />
      <path d="M-5 58 C 20 50, 35 72, 60 60 S 95 40, 110 48" fill="none" stroke="#cfe7f7" strokeWidth="9" strokeLinecap="round" />
      <path d="M-5 20 L 110 34" fill="none" stroke="#fff" strokeWidth="3.5" />
      <path d="M40 -5 L 52 100" fill="none" stroke="#fff" strokeWidth="3" />
      <path d={path} fill="none" stroke="#ff7a5c" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
