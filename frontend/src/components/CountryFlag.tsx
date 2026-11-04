import { useState } from 'react';

interface CountryFlagProps {
  code?: string;
  /** Emoji fallback, used when the image cannot load (Windows has no flag emoji, so the image comes first). */
  emoji?: string;
  className?: string;
}

export default function CountryFlag({ code, emoji, className = 'h-4 w-6 rounded-sm object-cover shadow-sm' }: CountryFlagProps) {
  const [failed, setFailed] = useState(false);

  if (!code || failed) {
    return emoji ? <span aria-hidden="true">{emoji}</span> : null;
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
