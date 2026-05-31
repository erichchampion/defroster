/**
 * Defroster — minimal line icons (1.75 stroke, currentColor).
 * Intentionally spare: the product leans on bold color-coded labels,
 * not decorative iconography. Ported from the "Thaw" redesign handoff.
 */
import type { ReactNode, SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'stroke' | 'fill'> {
  size?: number;
  stroke?: number;
  fill?: string;
  paths?: ReactNode;
  d?: string;
}

export function Icon({ d, paths, size = 24, stroke = 1.75, fill = 'none', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths || (d ? <path d={d} /> : null)}
    </svg>
  );
}

type P = Omit<IconProps, 'paths' | 'd'>;

export const Pin = (p: P) => <Icon {...p} paths={<><path d="M12 21s-6.5-5.7-6.5-10.5a6.5 6.5 0 1113 0C18.5 15.3 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.4" /></>} />;
export const Bell = (p: P) => <Icon {...p} paths={<><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10.2 20a2 2 0 003.6 0" /></>} />;
export const Lock = (p: P) => <Icon {...p} paths={<><rect x="5" y="11" width="14" height="9" rx="2.2" /><path d="M8 11V8a4 4 0 018 0v3" /></>} />;
export const Shield = (p: P) => <Icon {...p} paths={<><path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3z" /></>} />;
export const ShieldCheck = (p: P) => <Icon {...p} paths={<><path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3z" /><path d="M9 11.5l2 2 4-4" /></>} />;
export const Clock = (p: P) => <Icon {...p} paths={<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></>} />;
export const User = (p: P) => <Icon {...p} paths={<><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></>} />;
export const Toggle = (p: P) => <Icon {...p} paths={<><rect x="3" y="7" width="18" height="10" rx="5" /><circle cx="9" cy="12" r="2.6" fill="currentColor" stroke="none" /></>} />;
export const Blur = (p: P) => <Icon {...p} paths={<><circle cx="12" cy="12" r="8.5" strokeDasharray="2.5 3.2" /><circle cx="12" cy="12" r="3" /></>} />;
export const Globe = (p: P) => <Icon {...p} paths={<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.3 2.4 14.7 0 17M12 3.5c-2.4 2.3-2.4 14.7 0 17" /></>} />;
export const ChevDown = (p: P) => <Icon {...p} d="M6 9l6 6 6-6" />;
export const ChevRight = (p: P) => <Icon {...p} d="M9 6l6 6-6 6" />;
export const ArrowLeft = (p: P) => <Icon {...p} d="M15 6l-6 6 6 6" />;
export const Plus = (p: P) => <Icon {...p} d="M12 5v14M5 12h14" />;
export const Check = (p: P) => <Icon {...p} d="M5 12.5l4.2 4.2L19 7" />;
export const X = (p: P) => <Icon {...p} d="M6 6l12 12M18 6L6 18" />;
export const Alert = (p: P) => <Icon {...p} paths={<><path d="M12 4l8.5 15H3.5L12 4z" /><path d="M12 10v4M12 17h.01" /></>} />;
export const Refresh = (p: P) => <Icon {...p} paths={<><path d="M20 11a8 8 0 10-1.5 5.5" /><path d="M20 5v6h-6" /></>} />;
export const List = (p: P) => <Icon {...p} paths={<><path d="M8 7h12M8 12h12M8 17h12" /><circle cx="4" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4" cy="17" r="1" fill="currentColor" stroke="none" /></>} />;
export const MapIcon = (p: P) => <Icon {...p} paths={<><path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z" /><path d="M9 4v14M15 6v14" /></>} />;
export const Scale = (p: P) => <Icon {...p} paths={<><path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 5a3 3 0 005 0L5 8zM19 8l-2.5 5a3 3 0 005 0L19 8zM12 5l-5 2.5M12 5l5 2.5" /></>} />;
export const Book = (p: P) => <Icon {...p} paths={<><path d="M5 5.5A2 2 0 017 4h12v15H7a2 2 0 00-2 1.5V5.5z" /><path d="M5 18.5A2 2 0 017 17h12" /></>} />;
export const Heart = (p: P) => <Icon {...p} paths={<><path d="M12 20s-6.5-4.3-8.6-8.3C2 8.8 3.4 5.8 6.4 5.8c1.9 0 3 1.1 3.6 2.2.6-1.1 1.7-2.2 3.6-2.2 3 0 4.4 3 3 5.9C18.5 15.7 12 20 12 20z" /></>} />;
export const Eye = (p: P) => <Icon {...p} paths={<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>} />;
export const GitHub = (p: P) => <Icon {...p} paths={<><path d="M9 19c-4 1.2-4-2-5.5-2.5M15 21v-3.2c0-1 .3-1.6.8-2 -3-.3-6-1.4-6-6 0-1.4.5-2.5 1.3-3.4 -.2-.4-.6-1.7.1-3.4 0 0 1.1-.3 3.5 1.3a12 12 0 016.4 0C19 2.1 20.1 2.4 20.1 2.4c.7 1.7.3 3 .1 3.4.8.9 1.3 2 1.3 3.4 0 4.6-3 5.7-6 6 .5.4.9 1.2.9 2.5V21" /></>} />;
export const Share = (p: P) => <Icon {...p} paths={<><path d="M12 15V4" /><path d="M8.5 7.5L12 4l3.5 3.5" /><path d="M7 11H5.5A1.5 1.5 0 004 12.5v6A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5v-6A1.5 1.5 0 0018.5 11H17" /></>} />;
export const Home = (p: P) => <Icon {...p} paths={<><path d="M4 11l8-7 8 7" /><path d="M6 9.5V19a1 1 0 001 1h10a1 1 0 001-1V9.5" /><path d="M10 20v-5h4v5" /></>} />;
export const Apple = (p: P) => <Icon {...p} paths={<><path d="M16 13c0 3 2 4 2 4-.3 1-1.6 3-3 3-1 0-1.5-.6-2.7-.6s-1.8.6-2.8.6c-1.5 0-3-2.2-3.7-4.2C4.8 12.7 6.4 9 9 9c1 0 1.9.7 2.5.7S13 9 14.3 9c.9 0 2.3.4 3.1 1.7-2 .9-1.4 2.3-1.4 2.3z" /><path d="M14 6.5c.6-.8.9-1.8.8-2.5-.9.1-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9 0 1.7-.4 2.3-1.1z" /></>} />;

/** Maps privacy-grid icon keys (from i18n) to icon components. */
export const ICON_MAP: Record<string, (p: P) => React.JSX.Element> = {
  lock: Lock,
  blur: Blur,
  clock: Clock,
  shield: Shield,
  user: User,
  toggle: Toggle,
};
