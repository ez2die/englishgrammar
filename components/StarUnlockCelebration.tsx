import React, { useEffect, useState } from 'react';
import { starImg, effectImg, mascotImg, RARITY_LABEL, RARITY_GLOW, Rarity } from '../services/starmapService';

export type CelebrationItem =
  | { kind: 'star'; key: string; title: string; rarity: Rarity; points: number }
  | { kind: 'title'; name: string };

interface Props { items: CelebrationItem[]; onDone: () => void; }

const StarUnlockCelebration: React.FC<Props> = ({ items, onDone }) => {
  const [i, setI] = useState(0);
  const item = items[i];

  // auto-advance each celebration
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(() => next(), 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const next = () => {
    if (i + 1 < items.length) setI(i + 1);
    else onDone();
  };

  if (!item) return null;
  const glow = item.kind === 'star' ? RARITY_GLOW[item.rarity] : 'var(--gold)';

  return (
    <div
      className="fixed inset-0 z-[130] grid place-items-center overflow-hidden cursor-pointer"
      style={{ background: 'radial-gradient(120% 120% at 50% 40%, rgba(20,17,73,.82), rgba(6,6,22,.94))', backdropFilter: 'blur(4px)' }}
      onClick={next}
    >
      {/* shooting star sweeps across */}
      <img src={effectImg('shooting-star')} alt="" aria-hidden
        className="pointer-events-none absolute w-40 h-40 object-contain"
        style={{ animation: 'shootStar 1.1s ease-out forwards' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />

      <div key={i} className="relative text-center px-6 animate-scale-up">
        {/* glow + burst + star / banner */}
        <div className="relative mx-auto w-48 h-48 grid place-items-center">
          <div className="absolute inset-0 rounded-full animate-twinkle"
            style={{ background: `radial-gradient(circle, ${glow}55, transparent 65%)` }} />
          <img src={effectImg('burst-flare')} alt="" aria-hidden
            className="absolute w-48 h-48 object-contain animate-twinkle"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          {item.kind === 'star' ? (
            <img src={starImg(item.key)} alt=""
              className="relative w-28 h-28 object-contain"
              style={{ filter: `drop-shadow(0 0 20px ${glow})` }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
          ) : (
            <img src={mascotImg('celebrate')} alt=""
              className="relative w-32 h-32 object-contain animate-floatY"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
          )}
        </div>

        {item.kind === 'star' ? (
          <>
            <div className="mt-4 text-sm font-black tracking-widest text-white/70 uppercase">✨ 新星点亮</div>
            <div className="mt-1 text-3xl font-black font-display text-white">{item.title}</div>
            <div className="mt-2 inline-block text-xs font-black px-3 py-1 rounded-full" style={{ color: '#1b1b3a', background: glow }}>
              {RARITY_LABEL[item.rarity]}
            </div>
            {item.points > 0 && <div className="mt-2 text-lg font-black" style={{ color: 'var(--gold)' }}>+{item.points} 积分</div>}
          </>
        ) : (
          <>
            <div className="relative mt-4 mx-auto max-w-xs">
              <img src={effectImg('title-banner')} alt="" className="w-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-2xl font-black font-display text-white drop-shadow" style={{ textShadow: '0 2px 8px rgba(0,0,0,.6)' }}>{item.name}</div>
              </div>
            </div>
            <div className="mt-3 text-sm font-black tracking-widest text-white/70 uppercase">🌟 星座完成 · 获得称号</div>
          </>
        )}

        <div className="mt-6 text-xs text-white/50">
          点击继续{items.length > 1 ? ` · ${i + 1}/${items.length}` : ''}
        </div>
      </div>

      {/* stardust drift */}
      <img src={effectImg('stardust')} alt="" aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 w-full object-cover opacity-60"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
    </div>
  );
};

export default StarUnlockCelebration;
