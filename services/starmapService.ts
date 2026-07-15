// Star Map (语法星图) API + asset helpers. Consumes GET /api/user/starmap.

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface StarNode {
  key: string;
  rarity: Rarity;
  hidden: boolean;
  lit: boolean;
  litAt: string | null;
  title: string;                     // '???' for hidden & unlit
  progress?: { cur: number; target: number };
}
export interface ConstellationNode {
  key: string;
  title: string;
  titleKey: string | null;
  completed: boolean;
  stars: StarNode[];
}
export interface StarMapData {
  summary: { litCount: number; totalStars: number; constellationsDone: number; totalConstellations: number };
  activeTitle: string | null;
  titles: { key: string; name: string; earnedAt: string }[];
  constellations: ConstellationNode[];
}

// Runtime uses the optimized webp thumbnails (opt/) — ~8-15KB each vs ~400KB PNG
// masters. Backgrounds are already webp and stay in backgrounds/.
const ASSET = '/assets/star-map';
const OPT = `${ASSET}/opt`;
export const starImg = (key: string) => `${OPT}/stars/${key.replaceAll('.', '-')}-v1.webp`;
export const rarityFrame = (r: Rarity) => `${OPT}/rarities/${r}-base-v1.webp`;
export const constellationImg = (key: string) => `${OPT}/constellations/${key}-v1.webp`;
export const effectImg = (name: 'locked-mask' | 'hidden-question' | 'shooting-star' | 'burst-flare' | 'stardust' | 'title-banner') => `${OPT}/effects/${name}-v1.webp`;
export const mascotImg = (pose: 'guide' | 'celebrate') => `${OPT}/mascots/${pose}-v1.webp`;
export const bgImg = (variant: 'mobile' | 'desktop' | 'empty-state-cover') => `${ASSET}/backgrounds/${variant}-v1.webp`;

export const RARITY_LABEL: Record<Rarity, string> = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' };
export const RARITY_GLOW: Record<Rarity, string> = {
  common: 'var(--rar-common)', rare: 'var(--rar-rare)', epic: 'var(--rar-epic)', legendary: 'var(--rar-legend)',
};

export async function fetchStarMap(token: string): Promise<StarMapData | null> {
  try {
    const r = await fetch('/api/user/starmap', { headers: { Authorization: `Bearer ${token}` } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export async function wearTitle(token: string, titleKey: string | null): Promise<boolean> {
  try {
    const r = await fetch('/api/user/title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ titleKey }),
    });
    return r.ok;
  } catch { return false; }
}

/** The single unlit, non-hidden star closest to completion — for the "next star" nudge. */
export function nextStar(data: StarMapData): StarNode | null {
  let best: StarNode | null = null;
  let bestRatio = -1;
  for (const c of data.constellations) {
    for (const s of c.stars) {
      if (s.lit || s.hidden) continue;
      const ratio = s.progress && s.progress.target > 0 ? s.progress.cur / s.progress.target : 0;
      if (ratio > bestRatio) { bestRatio = ratio; best = s; }
    }
  }
  return best;
}
