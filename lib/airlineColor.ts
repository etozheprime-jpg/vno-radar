// Muted, harmonised palette; a few well-known carriers are pinned, the rest hash into it.
const PALETTE = ['#5b8cff', '#9b7bff', '#3fbf8f', '#f0a05a', '#ef6b6b', '#3cc3c9'];
const PINNED: Record<string, number> = { FR: 0, RK: 0, W6: 1, W4: 1, BT: 2, LO: 5, LH: 3, SK: 0, AY: 5, TK: 4, KL: 0 };

export function airlineColor(iata: string | null | undefined): string {
  const k = (iata ?? '').toUpperCase();
  if (k in PINNED) return PALETTE[PINNED[k]];
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
