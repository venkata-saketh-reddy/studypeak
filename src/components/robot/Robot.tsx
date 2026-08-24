import type { RobotMood } from '@/contexts/RobotContext';

interface RobotProps {
  mood: RobotMood;
  size?: number;
}

/**
 * "Bolt" — an original robot mascot for Studypeak.
 * Pure SVG so it scales crisply and animates via CSS classes.
 */
export function Robot({ mood, size = 72 }: RobotProps) {
  const excited = mood === 'excited' || mood === 'celebrating';
  const sleepy = mood === 'sleepy';
  const happy = mood === 'happy' || excited;

  // Eye shapes vary by mood
  const eyeRy = sleepy ? 1.2 : happy ? 3.4 : 4;
  const mouth = sleepy ? 'M 26 40 Q 32 37 38 40' : excited ? 'M 24 37 Q 32 46 40 37' : happy ? 'M 25 38 Q 32 44 39 38' : 'M 26 39 L 38 39';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`Bolt the robot companion (${mood})`}
      className={excited ? 'animate-robot-bounce' : 'animate-float-idle'}
    >
      {/* antenna */}
      <line x1="32" y1="8" x2="32" y2="14" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="6.5" r="3.5" fill={excited ? '#fbbf24' : '#4f7cff'}>
        {excited && <animate attributeName="r" values="3.5;4.5;3.5" dur="0.6s" repeatCount="indefinite" />}
      </circle>

      {/* head */}
      <rect x="12" y="14" width="40" height="32" rx="10" fill="#4f7cff" />
      <rect x="16" y="18" width="32" height="24" rx="7" fill="#eef2ff" />

      {/* ears */}
      <rect x="8" y="24" width="4" height="10" rx="2" fill="#3b5fd9" />
      <rect x="52" y="24" width="4" height="10" rx="2" fill="#3b5fd9" />

      {/* eyes */}
      <g className={sleepy ? '' : 'animate-blink'} style={{ transformOrigin: '32px 27px' }}>
        <ellipse cx="24" cy="27" rx="3.4" ry={eyeRy} fill="#1e293b" />
        <ellipse cx="40" cy="27" rx="3.4" ry={eyeRy} fill="#1e293b" />
        {!sleepy && (
          <>
            <circle cx="25.2" cy="25.8" r="1.1" fill="#fff" />
            <circle cx="41.2" cy="25.8" r="1.1" fill="#fff" />
          </>
        )}
      </g>

      {/* cheeks when happy */}
      {happy && (
        <>
          <circle cx="19" cy="33" r="2.2" fill="#fda4af" opacity="0.7" />
          <circle cx="45" cy="33" r="2.2" fill="#fda4af" opacity="0.7" />
        </>
      )}

      {/* mouth */}
      <path d={mouth} stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* body */}
      <rect x="18" y="48" width="28" height="12" rx="6" fill="#3b5fd9" />
      <rect x="27" y="51" width="10" height="4" rx="2" fill="#93c5fd" />

      {/* celebration sparkles */}
      {mood === 'celebrating' && (
        <g fill="#fbbf24">
          <path d="M6 12 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" />
          <path d="M58 10 l1.2 2.4 2.4 1.2 -2.4 1.2 -1.2 2.4 -1.2 -2.4 -2.4 -1.2 2.4 -1.2z" />
          <path d="M56 46 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1z" />
        </g>
      )}
    </svg>
  );
}
