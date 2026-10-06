import { useEffect, useState } from 'react';
import { getMatchTier } from '../../utils/equivalency';

interface ScoreRingProps {
  score: number;
  size?: number;
  /** Show the tier name ("Perfect match") under the ring. */
  showLabel?: boolean;
}

/** A circular score that fills up when it appears, coloured green for a perfect match, amber for partial, red for weak. */
export default function ScoreRing({ score, size = 56, showLabel = false }: ScoreRingProps) {
  const [shown, setShown] = useState(0);
  const tier = getMatchTier(score);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const stroke = Math.max(4, Math.round(size / 10));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div
        className={`relative rounded-full ${tier.key === 'perfect' ? 'motion-safe:animate-glow-pulse' : ''}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${tier.label}, score ${score} out of 100`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-200" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.min(100, Math.max(0, shown)) / 100)}
            className={`${tier.ring} transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold ${tier.text}`} style={{ fontSize: size * 0.3 }}>
          {score}
        </span>
      </div>
      {showLabel ? <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${tier.text}`}>{tier.label}</span> : null}
    </div>
  );
}
