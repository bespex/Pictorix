import type { Mode } from "./core/types";

/**
 * The illustrations of the five modes: small photo cards in the look of the app icon (sky, sun, hills, white
 * frame, soft shadow). The answer of each mode carries the icon's gold gradient with a soft glow; everything
 * else steps back, desaturated. Colours of frames, lines and shadows come from CSS custom properties set in
 * ModeArt.svelte, so the art follows light and dark mode.
 */
let uid = 0;
export function modeArt(kind: Mode): string {
  const id = `m${kind.replace(/\W/g, "")}${uid++}`;
  const defs = `<defs>
    <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7db8f2"/><stop offset="1" stop-color="#bfe0ff"/></linearGradient>
    <linearGradient id="${id}hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb06b"/><stop offset="1" stop-color="#2f8650"/></linearGradient>
    <linearGradient id="${id}hill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#83c98f"/><stop offset="1" stop-color="#5aa874"/></linearGradient>
    <linearGradient id="${id}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf4d"/><stop offset="1" stop-color="#f0861a"/></linearGradient>
    <linearGradient id="${id}goldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffcf4d"/><stop offset="1" stop-color="#f0861a"/></linearGradient>
    <radialGradient id="${id}halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="var(--halo)" stop-opacity=".9"/><stop offset="1" stop-color="var(--halo)" stop-opacity="0"/></radialGradient>
    <filter id="${id}mute"><feColorMatrix type="saturate" values=".18"/><feComponentTransfer><feFuncA type="linear" slope=".78"/></feComponentTransfer></filter>
    <filter id="${id}shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="2.2" stdDeviation="2.4" flood-color="var(--shadow)" flood-opacity="1"/></filter>
    <filter id="${id}glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2" result="b"/><feFlood flood-color="#ffb02e" flood-opacity=".55"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
  // a photo card centred at cx,cy
  const photo = (cx: number, cy: number, w: number, { rot = 0, muted = false, win = false } = {}) => {
    const h = Math.round(w * 0.78),
      x = -w / 2,
      y = -h / 2,
      p = Math.max(2.2, w * 0.07),
      iw = w - 2 * p,
      ih = h - 2 * p,
      ix = x + p,
      iy = y + p;
    const inner = `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${p * 0.6}" fill="url(#${id}sky)"/>
      <circle cx="${ix + iw * 0.72}" cy="${iy + ih * 0.3}" r="${ih * 0.11}" fill="#fff6c9"/>
      <path d="M${ix} ${iy + ih} L${ix} ${iy + ih * 0.7} Q${ix + iw * 0.3} ${iy + ih * 0.4} ${ix + iw * 0.55} ${iy + ih * 0.66} L${ix + iw} ${iy + ih * 0.5} L${ix + iw} ${iy + ih} Z" fill="url(#${id}hill2)"/>
      <path d="M${ix} ${iy + ih} L${ix} ${iy + ih * 0.86} Q${ix + iw * 0.45} ${iy + ih * 0.52} ${ix + iw} ${iy + ih * 0.82} L${ix + iw} ${iy + ih} Z" fill="url(#${id}hill)"/>`;
    const frame = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${p * 1.1}" fill="var(--frame)" ${win ? `stroke="url(#${id}gold)" stroke-width="2.4"` : `stroke="var(--frame-line)" stroke-width=".8"`}/>`;
    return `<g transform="translate(${cx} ${cy}) rotate(${rot})" filter="url(#${id}${muted ? "mute" : "shadow"})"><g ${muted ? `filter="url(#${id}shadow)"` : ""}>${frame}${inner}</g></g>`;
  };
  const badge = (cx: number, cy: number, n: number, gold = false) =>
    `<g transform="translate(${cx} ${cy})" ${gold ? `filter="url(#${id}glow)"` : ""}><circle r="7.5" fill="${gold ? `url(#${id}gold)` : "var(--chip)"}" ${gold ? 'stroke="#fff" stroke-width="1.4"' : ""}/><text y="3.4" text-anchor="middle" font-size="9.5" font-weight="800" fill="${gold ? "#fff" : "var(--ink)"}" font-family="system-ui,sans-serif">${n}</text></g>`;
  const star = (cx: number, cy: number, r: number, on: boolean) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5,
        rr = i % 2 ? r * 0.45 : r;
      pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(" ")}" stroke-linejoin="round" ${on ? `fill="url(#${id}gold)"` : 'fill="none" stroke="var(--ink-soft)" stroke-width="1.3"'}/>`;
  };
  const crown = (cx: number, cy: number, s: number) =>
    `<g transform="translate(${cx} ${cy}) scale(${s})" filter="url(#${id}glow)"><path d="M-14 6 L-17 -9 L-7 -2 L0 -13 L7 -2 L17 -9 L14 6 Z" fill="url(#${id}gold)" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><circle cx="-17" cy="-10" r="2.4" fill="#fff"/><circle cx="0" cy="-14" r="2.4" fill="#fff"/><circle cx="17" cy="-10" r="2.4" fill="#fff"/></g>`;
  const sparkle = (cx: number, cy: number, r: number) =>
    `<path d="M${cx} ${cy - r} Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy} Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r} Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy} Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r} Z" fill="#ffd56a"/>`;
  const halo = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}halo)"/>`;
  const folder = (cx: number, cy: number, w: number, gold = false) => {
    const h = w * 0.72,
      x = cx - w / 2,
      y = cy - h / 2;
    return `<g ${gold ? `filter="url(#${id}glow)"` : `filter="url(#${id}shadow)"`}><path d="M${x} ${y + 3} q0 -3 3 -3 h${w * 0.3} l${w * 0.08} ${h * 0.14} h${w * 0.62 - 6} q3 0 3 3 v${h * 0.86 - 3} q0 3 -3 3 h${-w + 6} q-3 0 -3 -3 z" fill="${gold ? `url(#${id}gold)` : "var(--folder)"}"/><path d="M${x} ${y + h * 0.3} h${w} v${h * 0.7 - 3} q0 3 -3 3 h${-w + 6} q-3 0 -3 -3 z" fill="${gold ? "#ffffff" : "var(--folder-front)"}" opacity="${gold ? 0.28 : 1}"/></g>`;
  };
  const W = 160,
    H = 120;
  let body = "";
  switch (kind) {
    case "order":
      body = `${halo(34, 66, 34)}
        ${photo(34, 66, 40, { win: true })}${photo(80, 70, 36, { muted: true })}${photo(124, 70, 36, { muted: true })}
        <path d="M124 48 C 118 18, 52 14, 40 38" fill="none" stroke="url(#${id}goldH)" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.1 6" opacity=".9"/>
        <path d="M33 33 L40 41 L47 33" fill="none" stroke="#f39a24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${badge(34, 98, 1, true)}${badge(80, 98, 2)}${badge(124, 98, 3)}`;
      break;
    case "simple-knockout":
      body = `${halo(80, 34, 34)}
        <g fill="none" stroke="var(--line)" stroke-width="1.4" stroke-linecap="round"><path d="M22 90 V80 H58 V90 M102 90 V80 H138 V90 M120 80 V66 H80"/></g>
        <g fill="none" stroke="url(#${id}gold)" stroke-width="2.4" stroke-linecap="round"><path d="M58 90 V80 M40 80 V66 H80 V50"/></g>
        ${photo(22, 100, 26, { muted: true })}${photo(58, 100, 26)}${photo(102, 100, 26, { muted: true })}${photo(138, 100, 26, { muted: true })}
        ${photo(80, 38, 40, { win: true })}${crown(80, 14, 0.78)}${sparkle(108, 14, 4.5)}${sparkle(53, 24, 3)}`;
      break;
    case "full-knockout":
      body = `${halo(80, 50, 40)}
        <rect x="58" y="70" width="44" height="40" rx="4" fill="url(#${id}gold)" filter="url(#${id}glow)"/>
        <rect x="14" y="82" width="42" height="28" rx="4" fill="var(--podium)" filter="url(#${id}shadow)"/>
        <rect x="104" y="90" width="42" height="20" rx="4" fill="var(--podium)" filter="url(#${id}shadow)"/>
        <text x="80" y="96" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">1</text>
        <text x="35" y="102" text-anchor="middle" font-size="12" font-weight="800" fill="var(--ink-soft)" font-family="system-ui,sans-serif">2</text>
        <text x="125" y="105" text-anchor="middle" font-size="12" font-weight="800" fill="var(--ink-soft)" font-family="system-ui,sans-serif">3</text>
        ${photo(35, 67, 34, { rot: -4 })}${photo(125, 75, 34, { rot: 4 })}${photo(80, 50, 40, { win: true })}${sparkle(106, 30, 4.5)}${sparkle(55, 38, 3)}`;
      break;
    case "rate":
      body = `${halo(80, 54, 46)}
        ${photo(80, 50, 76, { win: false })}
        <g filter="url(#${id}shadow)"><rect x="28" y="80" width="104" height="24" rx="12" fill="var(--glass)" stroke="var(--frame-line)" stroke-width=".8"/></g>
        <g filter="url(#${id}glow)">${[0, 1, 2, 3].map((i) => star(42 + i * 19, 92, 7.2, true)).join("")}</g>${star(42 + 4 * 19, 92, 7.2, false)}`;
      break;
    case "categorize":
      body = `${halo(80, 88, 34)}
        <path d="M60 30 C 92 20, 92 52, 82 70" fill="none" stroke="url(#${id}gold)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 5.5"/>
        ${folder(32, 92, 40)}${folder(128, 92, 40)}
        ${folder(80, 92, 46, true)}
        ${photo(50, 30, 34, { rot: -10, win: true })}`;
      break;
  }
  return varsToStyle(`<svg viewBox="0 0 ${W} ${H}" class="mode-art2" role="img">${defs}${body}</svg>`);
}

/**
 * Moves `attr="var(--x)"` into a style attribute: custom properties in presentation attributes are not
 * understood everywhere (Firefox, WebKitGTK), in style properties they are.
 */
function varsToStyle(svg: string): string {
  return svg.replace(/<([a-zA-Z]+)([^>]*?)(\/?)>/g, (tag, name: string, attrs: string, close: string) => {
    const styles: string[] = [];
    const rest = attrs.replace(/\s([a-z-]+)="(var\(--[\w-]+\))"/g, (_m, attr: string, value: string) => {
      styles.push(`${attr}:${value}`);
      return "";
    });
    return styles.length ? `<${name}${rest} style="${styles.join(";")}"${close}>` : tag;
  });
}
