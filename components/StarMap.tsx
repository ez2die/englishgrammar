import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchStarMap, wearTitle, nextStar, starImg, rarityFrame, constellationImg,
  effectImg, mascotImg, bgImg, RARITY_LABEL, RARITY_GLOW,
  StarMapData, StarNode, Rarity,
} from '../services/starmapService';

interface Props { onClose: () => void; }

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

const StarTile: React.FC<{ star: StarNode; onClick: () => void }> = ({ star, onClick }) => {
  const glow = RARITY_GLOW[star.rarity];
  const hiddenUnlit = star.hidden && !star.lit;
  const src = hiddenUnlit ? effectImg('hidden-question') : starImg(star.key);
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center gap-1 w-[76px] shrink-0 focus:outline-none"
      aria-label={star.title}
    >
      <div
        className={`relative w-16 h-16 rounded-2xl grid place-items-center transition-transform group-active:scale-95 ${star.lit ? 'group-hover:-translate-y-1' : ''}`}
        style={star.lit ? { filter: `drop-shadow(0 0 10px ${glow})` } : undefined}
      >
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
          className={`w-16 h-16 object-contain ${star.lit ? 'animate-twinkle' : hiddenUnlit ? 'opacity-70' : 'grayscale opacity-40'}`}
        />
      </div>
      <span className={`text-[10px] font-bold leading-tight text-center ${star.lit ? 'text-white' : 'text-white/45'}`}>
        {star.title}
      </span>
      {!star.lit && star.progress && star.progress.target > 0 && (
        <div className="w-12 h-1 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.round((star.progress.cur / star.progress.target) * 100)}%`, background: 'var(--gold)' }} />
        </div>
      )}
    </button>
  );
};

const StarDetail: React.FC<{ star: StarNode; onClose: () => void }> = ({ star, onClose }) => {
  const hiddenUnlit = star.hidden && !star.lit;
  const glow = RARITY_GLOW[star.rarity];
  const src = hiddenUnlit ? effectImg('hidden-question') : starImg(star.key);
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-xs rounded-3xl p-6 text-center border border-white/10"
        style={{ background: 'linear-gradient(160deg, var(--sky-2), var(--sky-1))', boxShadow: `0 0 40px ${star.lit ? glow : 'rgba(0,0,0,.5)'}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mx-auto w-28 h-28 grid place-items-center" style={star.lit ? { filter: `drop-shadow(0 0 18px ${glow})` } : undefined}>
          <img src={src} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            className={`w-28 h-28 object-contain ${star.lit ? '' : hiddenUnlit ? 'opacity-80' : 'grayscale opacity-50'}`} />
        </div>
        <div className="mt-3 text-xl font-black font-display text-white">{star.title}</div>
        <div className="mt-1 inline-block text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: '#1b1b3a', background: glow }}>
          {RARITY_LABEL[star.rarity]}{star.hidden ? ' · 隐藏' : ''}
        </div>
        <div className="mt-3 text-sm font-medium text-white/80">
          {star.lit ? `已点亮 · ${fmtDate(star.litAt)}`
            : hiddenUnlit ? '神秘成就 —— 达成条件保密,继续探索吧 ✨'
              : star.progress && star.progress.target > 0
                ? <>进度 {star.progress.cur}/{star.progress.target} · 还差 {star.progress.target - star.progress.cur} 就点亮</>
                : '继续努力就能点亮这颗星 ✨'}
        </div>
        {!star.lit && star.progress && star.progress.target > 0 && (
          <div className="mt-3 h-2 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.round((star.progress.cur / star.progress.target) * 100)}%`, background: 'var(--gold)' }} />
          </div>
        )}
        <button onClick={onClose} className="mt-5 px-5 h-9 rounded-xl font-black text-sm text-[#1b1b3a]" style={{ background: 'var(--gold)' }}>知道啦</button>
      </div>
    </div>
  );
};

const StarMap: React.FC<Props> = ({ onClose }) => {
  const { token } = useAuth();
  const [data, setData] = useState<StarMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StarNode | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchStarMap(token).then((d) => { setData(d); setLoading(false); });
  }, [token]);

  const wide = typeof window !== 'undefined' && window.innerWidth >= 768;
  const dots = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    left: (i * 137.5) % 100, top: (i * 53.3) % 100, size: (i % 3) + 1, delay: (i % 7) * 0.4,
  })), []);

  const upcoming = data ? nextStar(data) : null;

  const handleWear = async (key: string | null) => {
    if (!token || !data) return;
    const ok = await wearTitle(token, key);
    if (ok) setData({ ...data, activeTitle: key });
  };

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto"
      style={{ backgroundColor: 'var(--sky-0)', backgroundImage: `linear-gradient(180deg, rgba(10,10,36,.55), rgba(10,10,36,.85)), url(${bgImg(wide ? 'desktop' : 'mobile')})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      {/* atmosphere */}
      <div className="pointer-events-none fixed inset-0">
        {dots.map((d, i) => (
          <span key={i} className="absolute rounded-full bg-white animate-twinkle"
            style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, opacity: 0.5, animationDelay: `${d.delay}s` }} />
        ))}
      </div>

      <div className="relative max-w-3xl mx-auto px-4 pt-5 pb-16">
        {/* header */}
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">←</button>
          <h1 className="text-2xl font-black font-display" style={{ background: 'linear-gradient(90deg, var(--gold-soft), var(--gold))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            🌌 语法星图
          </h1>
          <div className="w-9" />
        </div>

        {loading ? (
          <div className="text-center py-24 text-white/60">星图加载中…</div>
        ) : !data ? (
          <div className="text-center py-24 text-white/60">登录后即可查看你的星图 ✨</div>
        ) : (
          <>
            {/* summary + mascot */}
            <div className="mt-4 flex items-center gap-4 rounded-3xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,.06)' }}>
              <img src={mascotImg('guide')} alt="" className="w-16 h-16 object-contain animate-floatY shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              <div className="flex-1 min-w-0">
                <div className="text-white font-black">
                  已点亮 <span style={{ color: 'var(--gold)' }}>{data.summary.litCount}</span>/{data.summary.totalStars} 星
                  <span className="mx-2 opacity-30">·</span>
                  星座 <span style={{ color: 'var(--gold)' }}>{data.summary.constellationsDone}</span>/{data.summary.totalConstellations}
                </div>
                {upcoming && upcoming.progress && (
                  <div className="text-xs text-white/70 mt-1">
                    下一颗:<b className="text-white">{upcoming.title}</b> —— 还差 {upcoming.progress.target - upcoming.progress.cur} 点亮 ✨
                  </div>
                )}
              </div>
            </div>

            {/* titles */}
            {data.titles.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-black uppercase text-white/50 mb-2">称号(点击佩戴)</div>
                <div className="flex flex-wrap gap-2">
                  {data.titles.map((t) => {
                    const active = data.activeTitle === t.key;
                    return (
                      <button key={t.key} onClick={() => handleWear(active ? null : t.key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-black border transition-all ${active ? 'text-[#1b1b3a]' : 'text-white/85 border-white/15 hover:border-white/40'}`}
                        style={active ? { background: 'var(--gold)', borderColor: 'var(--gold)' } : { background: 'rgba(255,255,255,.05)' }}>
                        🏵️ {t.name}{active ? ' ✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* constellations */}
            <div className="mt-6 space-y-5">
              {data.constellations.map((c) => {
                const litInC = c.stars.filter((s) => s.lit).length;
                const started = litInC > 0;
                return (
                  <section key={c.key} className="rounded-3xl p-4 border border-white/10" style={{ background: 'rgba(255,255,255,.04)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <img src={constellationImg(c.key)} alt="" className={`w-12 h-12 object-contain ${started ? '' : 'grayscale opacity-40'}`}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                      <div className="flex-1">
                        <div className="text-white font-black font-display flex items-center gap-2">
                          {c.title}
                          {c.completed && <span className="text-[10px] px-2 py-0.5 rounded-full text-[#1b1b3a] font-black" style={{ background: 'var(--gold)' }}>已集齐 ✓</span>}
                        </div>
                        <div className="text-xs text-white/50">{litInC}/{c.stars.length} 已点亮</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                      {c.stars.map((s) => <StarTile key={s.key} star={s} onClick={() => setSelected(s)} />)}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selected && <StarDetail star={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default StarMap;
