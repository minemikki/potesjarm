import { useId } from "react";

// Ett samlet ikonsett (24px grid, 2px strek, runde ender) – erstatter løse Unicode-tegn og emoji i UI-et.
const P = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></>,
  live: <><circle cx="12" cy="12" r="2.5" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4" /><path d="M4.9 4.9a10 10 0 0 0 0 14.2M19.1 19.1a10 10 0 0 0 0-14.2" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8" /></>,
  dog: <><path d="M11.25 16.25h1.5L12 17z" /><path d="M16 14v.5" /><path d="M4.42 11.25A13 13 0 0 0 4 14.56C4 18.73 7.58 21 12 21s8-2.27 8-6.44a11.7 11.7 0 0 0-.49-3.31" /><path d="M8 14v.5" /><path d="M8.5 8.5c-.38 1.05-1.08 2.03-2.34 2.5-1.93.72-3.58-.3-3.66-1-.11-.99 1.18-6.53 4-7 1.92-.32 3.65.85 3.65 2.24A7.5 7.5 0 0 1 14 5.28c0-1.39 1.84-2.6 3.77-2.28 2.82.47 4.11 6.01 4 7-.08.7-1.73 1.72-3.66 1-1.26-.47-1.86-1.45-2.24-2.5" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /><path d="M8 14h2M14 14h2M8 17h2" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  userPlus: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M19 8v6M16 11h6" /></>,
  map: <><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z" /><path d="M9 4v14M15 6v14" /></>,
  heart: <path d="M12 20s-7.5-4.6-9-9.3C1.9 7.1 4.2 4 7.4 4c1.9 0 3.4 1 4.6 2.6C13.2 5 14.7 4 16.6 4c3.2 0 5.5 3.1 4.4 6.7C19.5 15.4 12 20 12 20Z" />,
  comment: <path d="M20 11.5a7.8 7.8 0 0 1-11.3 7L4 20l1.4-4.2A7.8 7.8 0 1 1 20 11.5Z" />,
  bookmark: <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21L12 16.8 5.5 21V4.5a1 1 0 0 1 1-1Z" />,
  share: <><path d="M12 3v12" /><path d="m7.5 7.5 4.5-4.5 4.5 4.5" /><path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" /></>,
  more: <><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronDown: <path d="m5 9 7 7 7-7" />,
  arrowRight: <path d="M4 12h15m-6-6 6 6-6 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  gift: <><rect x="3.5" y="8" width="17" height="4.5" rx="1" /><path d="M5 12.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7.5M12 8v13" /><path d="M12 8S10.5 3.5 8 3.5a2.2 2.2 0 0 0 0 4.5M12 8s1.5-4.5 4-4.5a2.2 2.2 0 0 1 0 4.5" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z" /><path d="m9 12 2 2 4-4" /></>,
  walk: <><circle cx="13" cy="4.5" r="1.8" /><path d="m9 20 2.5-6.5L14 16v5" /><path d="M7 11.5 9.5 8h4l2.5 3.5 2.5 1" /><path d="m11.5 13.5 1-5" /></>,
  ball: <><circle cx="12" cy="12" r="9" /><path d="M5.5 5.8c3.6 1.7 5.6 5.8 4.6 9.7M18.5 18.2c-3.6-1.7-5.6-5.8-4.6-9.7" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></>,
  sprout: <><path d="M12 21v-9" /><path d="M12 12C12 8 9 5.5 4.5 5.5 4.5 10 7.5 12 12 12Z" /><path d="M12 14.5c0-3.5 2.5-6 7-6 0 4-3 6-7 6Z" /></>,
  coffee: <><path d="M4.5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" /><path d="M16.5 10.5h1.5a2.5 2.5 0 0 1 0 5h-1.8" /><path d="M8 3.5c-.6.8-.6 1.7 0 2.5M12 3.5c-.6.8-.6 1.7 0 2.5" /></>,
  trees: <><path d="M8 21v-4M16 21v-3" /><path d="M8 3 3.5 12h3L4 17h8l-2.5-5h3z" /><path d="m16 7-3.5 7h2L13 18h6l-1.5-4h2z" /></>,
  waves: <><path d="M2.5 8c2 0 2-1.5 4.75-1.5S9.5 8 12 8s2.5-1.5 4.75-1.5S19 8 21.5 8" /><path d="M2.5 13c2 0 2-1.5 4.75-1.5S9.5 13 12 13s2.5-1.5 4.75-1.5S19 13 21.5 13" /><path d="M2.5 18c2 0 2-1.5 4.75-1.5S9.5 18 12 18s2.5-1.5 4.75-1.5S19 18 21.5 18" /></>,
  mountain: <><path d="m3 20 6.5-12 4 7 2.5-4 5 9z" /><path d="m8 10.5 1.5 1.5 1.5-1.5" /></>,
  rain: <><path d="M7 15a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 7.5a3.8 3.8 0 0 1-.5 7.5" /><path d="m9 18-1 2.5M13 17l-1 3M17 18l-1 2.5" /></>,
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />,
  trophy: <><path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0z" /><path d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4" /><path d="M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z" /></>,
  snow: <><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" /><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  send: <><path d="M21 3 10 14" /><path d="m21 3-7 18-4-7-7-4z" /></>,
  camera: <><path d="M4 8a2 2 0 0 1 2-2h1.5L9 4h6l1.5 2H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.5" /></>,
  paw: <><circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" /><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  sparkle: <path d="M12 3c.6 4.3 2.7 6.4 7 7-4.3.6-6.4 2.7-7 7-.6-4.3-2.7-6.4-7-7 4.3-.6 6.4-2.7 7-7Z" />,
  alert: <><path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5v4M12 17h.01" /></>,
  route: <><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />,
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  verified: <><path d="M12 2.8 14.4 4.6 17.4 4.5 18.3 7.4 20.8 9.1 19.8 12 20.8 14.9 18.3 16.6 17.4 19.5 14.4 19.4 12 21.2 9.6 19.4 6.6 19.5 5.7 16.6 3.2 14.9 4.2 12 3.2 9.1 5.7 7.4 6.6 4.5 9.6 4.6z" /><path d="m8.8 12 2.2 2.2 4.2-4.4" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.8M6.5 6.6A17 17 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 4.4-1.1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  bolt: <path d="M13 2.5 4.5 13.5H12L11 21.5l8.5-11H12z" />,
  grid: <><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m20.5 16-5-5-9 8.5" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l5-5-5-5M15 12H4" /></>,
  bone: <path d="M17.5 3.5a2.5 2.5 0 0 1 2 4.1 2.5 2.5 0 1 1-2.9 3.3L10.9 16.6a2.5 2.5 0 1 1-3.3 2.9 2.5 2.5 0 1 1-4.1-2 2.5 2.5 0 1 1 3-3.4l5.7-5.7a2.5 2.5 0 1 1 3.4-3 2.5 2.5 0 0 1 1.9-1.9Z" />,
  play: <path d="M7 4.5v15l12.5-7.5z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></>,
  locate: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
};

export default function Icon({ name, size = 20, stroke = 2, className = "", fill = "none", title }) {
  const shape = P[name];
  if (!shape) return null;
  return (
    <svg
      className={"icon " + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {shape}
    </svg>
  );
}

// Potesjarm-merket: en myk, fylt pote i blått/cyan.
export function PawLogo({ size = 40 }) {
  const gid = "paw" + useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="pawLogo">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6fd2ff" />
          <stop offset=".55" stopColor="#3f7bff" />
          <stop offset="1" stopColor="#2b52f0" />
        </linearGradient>
      </defs>
      <ellipse cx="11" cy="20" rx="5" ry="6.2" transform="rotate(-18 11 20)" fill={`url(#${gid})`} />
      <ellipse cx="19.5" cy="11.5" rx="5.2" ry="6.6" transform="rotate(-6 19.5 11.5)" fill={`url(#${gid})`} />
      <ellipse cx="30" cy="11.5" rx="5.2" ry="6.6" transform="rotate(8 30 11.5)" fill={`url(#${gid})`} />
      <ellipse cx="38.5" cy="20.5" rx="5" ry="6.2" transform="rotate(20 38.5 20.5)" fill={`url(#${gid})`} />
      <path d="M24.5 22c5.8 0 12 7.6 12 13.4 0 4.3-3.3 6.6-7 6.6-2.4 0-3.3-1.2-5-1.2s-2.7 1.2-5.2 1.2c-3.7 0-6.8-2.3-6.8-6.6C12.5 29.6 18.7 22 24.5 22Z" fill={`url(#${gid})`} />
    </svg>
  );
}

// Enkel strektegning av en hund til bunnen av menyen (dekor).
export function DogDoodle() {
  return (
    <svg viewBox="0 0 120 110" className="dogDoodle" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M38 30c-6-10-20-10-24-2-3 6 0 14 6 16" />
      <path d="M40 28c8-8 22-8 30 0 5 5 6 13 4 20" />
      <path d="M58 22c4-10 16-12 22-5 5 6 2 16-4 18" />
      <path d="M26 42c-2 10 2 20 12 24" />
      <circle cx="48" cy="42" r="1.6" fill="currentColor" />
      <circle cx="64" cy="42" r="1.6" fill="currentColor" />
      <path d="M53 52c2 2 5 2 7 0" />
      <path d="M56 50v3" />
      <path d="M38 66c-4 10-4 24 0 34M72 60c8 8 12 24 10 40" />
      <path d="M44 100h8M78 100h8" />
      <path d="M52 76c0 8 0 16 1 24M66 78c1 7 1 15 0 22" />
      <path d="M82 70c10-4 18 0 22-8" />
    </svg>
  );
}
