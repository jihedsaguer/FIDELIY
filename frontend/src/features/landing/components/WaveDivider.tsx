import type { CSSProperties } from 'react';

interface WaveDividerProps {
  /** Background of the section above (CSS colour, e.g. `var(--landing-paper)`). */
  top: string;
  /** Background of the section below. */
  bottom: string;
  flip?: boolean;
}

/** Decorative wave between two section colours: one inline SVG path, stretched. */
export function WaveDivider({ top, bottom, flip = false }: WaveDividerProps) {
  return (
    <div aria-hidden="true" className="landing-wave" style={{ background: top } as CSSProperties}>
      <svg
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        focusable="false"
        className={flip ? 'landing-wave-flip' : undefined}
      >
        <path
          fill={bottom}
          d="M0 32 C 180 64 360 64 540 36 S 900 0 1080 24 S 1320 60 1440 36 L 1440 64 L 0 64 Z"
        />
      </svg>
    </div>
  );
}
