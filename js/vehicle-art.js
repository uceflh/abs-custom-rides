// Side-profile line drawings for vehicles, returned as inline SVG strings.
// Pure module: no DOM access, safe with partial vehicle objects.
//
// Contract for consumers:
//   vehicleArt(v, { animate, label, className, tone }) -> '<svg class="va va-<shape> va-<tone> [va-animate]" ...>'
//     tone 'ink' (default): engraving-style ink line drawing with aged paint, for paper backgrounds
//     tone 'cream': cream strokes and glossy paint, for dark asphalt panels
//   paintColor(v) -> '#rrggbb'
//   vehicleArtCSS -> CSS string with the draw/fade keyframes, to inject where needed
// The SVG is fully styled with presentation attributes and needs no CSS.
// Animation hooks (CSS is written by the consumer):
//   .va-animate   added when opts.animate is true
//   .va-l         every stroked outline; each has pathLength="1" and style="--k:<index>" for staggering
//                 e.g. .va-animate .va-l { stroke-dasharray: 1 1; stroke-dashoffset: 1; animation: draw 2s forwards calc(var(--k) * 40ms) }
//   .va-f         fills (paint, glass, shadow, lights), e.g. fade in after the strokes

const CREAM = '#F8EED8';
const INK = 'rgba(20,18,14,.55)';
const PAPER = '#EEE3CB';
let seq = 0;

const TONES = {
  cream: { stroke: CREAM, strokeOp: '.85', tire: '#07090E', rim: '#161B26', hub: CREAM, tread: CREAM, glass: '#0A0E17', dark: '#11141C', under: '#D7CDB9', tail: '#C8304A', accent: '#C8304A', detailLight: INK, detailDark: CREAM, alt: CREAM },
  ink: { stroke: '#221D18', strokeOp: '.92', tire: '#221D18', rim: '#F7F0DF', hub: '#221D18', tread: PAPER, glass: '#D8C59E', dark: '#4B4137', under: '#4B4137', tail: '#A3301F', accent: '#A3301F', detailLight: 'rgba(34,29,24,.7)', detailDark: 'rgba(242,230,204,.6)', alt: '#221D18' }
};

export const vehicleArtCSS = '.va-animate .va-l{stroke-dasharray:1 1;stroke-dashoffset:1;animation:vaDraw 1.9s cubic-bezier(.2,.7,.2,1) forwards;animation-delay:calc(.35s + var(--k,0) * 30ms)}' +
  '.va-animate .va-f{opacity:0;animation:vaFade 1.1s ease forwards;animation-delay:1.5s}' +
  '@keyframes vaDraw{to{stroke-dashoffset:0}}@keyframes vaFade{to{opacity:1}}' +
  '@media (prefers-reduced-motion:reduce){.va-animate .va-l,.va-animate .va-f{animation-duration:.01ms!important;animation-delay:0s!important}}';

const PAINTS = [
  [/bordeaux|burgund/i, '#5C1626'],
  [/rosso|rouge|red|guards|corsa/i, '#8E1B2C'],
  [/vert|green|coniston|ardennes/i, '#1F3A2B'],
  [/bleu|blue|navy|marine|nuit/i, '#1B2A4C'],
  [/blanc|white|cr[eè]me|beige|ivoire|ivory|papyrus|sable/i, '#E8DCC2'],
  [/noir|black|nero/i, '#141519'],
  [/gris|grey|gray|argent|silver|anthracite/i, '#868B94'],
  [/orange|inka/i, '#C25E1E'],
  [/jaune|yellow|giallo/i, '#C9A12A']
];

function paints(v) {
  const s = String((v && v.colorExt) || '');
  return PAINTS.map(([re, c]) => { const m = s.match(re); return m ? [m.index, c] : null; })
    .filter(Boolean).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
}

export function paintColor(v) { return paints(v)[0] || '#2E3340'; }

function accentColor(v, fallback) { return paints(v)[1] || fallback; }

function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(hex, to, t) {
  const a = rgb(hex), b = rgb(to);
  return '#' + a.map((x, i) => Math.round(x + (b[i] - x) * t).toString(16).padStart(2, '0')).join('');
}
function isLight(hex) { const [r, g, b] = rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6; }
// sun-faded paint: pull toward grey, then toward paper
function aged(hex) {
  const [r, g, b] = rgb(hex);
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const grey = '#' + [l, l, l].map((x) => x.toString(16).padStart(2, '0')).join('');
  return mix(mix(hex, grey, 0.32), PAPER, 0.24);
}
const f = (n) => Math.round(n * 10) / 10;
const circ = (x, y, r) => `M${f(x - r)} ${y}a${r} ${r} 0 1 0 ${f(2 * r)} 0a${r} ${r} 0 1 0 ${f(-2 * r)} 0Z`;

function shapeOf(v) {
  const cat = (v && v.category) || '';
  const name = ((v && v.make) || '') + ' ' + ((v && v.model) || '');
  if (cat === 'Moto') return 'moto';
  if (cat === 'Quad / Buggy') return 'buggy';
  if (cat === 'Nautique') return 'jetski';
  if (cat === 'Engin') return 'engin';
  if (/defender|range rover|land cruiser|series|g-class|4x4|wrangler|jeep|patrol/i.test(name)) return 'boxy';
  if (/W123|W108|W114|280 SE|300 D|230|sedan|berline|saloon/i.test(name)) return 'saloon';
  if (/cabrio|spider|spyder|roadster|convertible|barchetta/i.test(name)) return 'roadster';
  return 'coupe';
}

const CAR_TAIL = 'L530 206A42 42 0 0 0 446 206L192 206A42 42 0 0 0 108 206Z';
const SHAPES = {
  coupe: {
    wheels: [[150, 202, 34], [488, 202, 34]],
    body: 'M52 206L50 184Q50 168 66 164L132 156C160 150 196 112 236 104L318 100C344 100 370 124 392 140L520 150Q572 154 586 170Q592 182 588 198L584 206' + CAR_TAIL,
    glass: ['M244 112L316 108C336 108 356 124 372 140L226 142C230 130 236 118 244 112Z'],
    lines: ['M298 109L297 141', 'M296 146Q299 176 295 200', 'M404 146Q408 176 404 200', 'M378 160L392 160'],
    chrome: ['M42 196L64 196', 'M578 198L598 198'],
    shine: 'M62 178Q320 166 584 182', head: [580, 170, 7], tail: [56, 174], hy: 180
  },
  roadster: {
    wheels: [[150, 202, 34], [488, 202, 34]],
    body: 'M52 206L50 184Q50 168 66 164L140 154L392 148L520 150Q572 154 586 170Q592 182 588 198L584 206' + CAR_TAIL,
    dark: ['M162 156Q170 134 208 132Q236 134 246 153Z', 'M274 151Q271 126 286 123Q299 124 298 151Z'],
    glass: ['M390 148L356 110L348 112L372 149Z'],
    lines: ['M390 148L354 108', 'M304 152Q307 178 303 200', 'M402 150Q406 178 402 200', 'M380 162L394 162', 'M330 150Q336 132 352 134'],
    chrome: ['M42 196L64 196', 'M578 198L598 198'],
    shine: 'M62 178Q320 166 584 182', head: [580, 170, 7], tail: [56, 174], hy: 180
  },
  saloon: {
    wheels: [[160, 201, 35, 'disc'], [486, 201, 35, 'disc']],
    body: 'M48 206L46 170Q46 156 62 154L176 148C190 144 200 116 222 104Q228 100 240 100L366 98Q376 98 384 106L418 142L560 148Q582 150 588 164L592 196Q592 206 582 206L530 206A44 44 0 0 0 442 206L204 206A44 44 0 0 0 116 206Z',
    glass: ['M232 108Q236 104 246 104L296 104L296 140L210 142Q218 120 232 108Z', 'M308 104L362 102Q370 102 376 110L404 140L308 140Z'],
    lines: ['M302 104L302 200', 'M412 146Q418 176 413 200', 'M207 146Q203 172 207 196', 'M384 158L398 158', 'M272 158L286 158'],
    chrome: ['M36 192L70 192', 'M574 192L600 192', 'M70 178L574 180'],
    shine: 'M54 170Q320 160 586 172', head: [584, 166, 8], tail: [52, 166], hy: 182
  },
  boxy: {
    wheels: [[160, 196, 40, 'steel'], [480, 196, 40, 'steel']],
    body: 'M58 198L56 74Q56 62 68 62L392 60Q402 60 406 68L424 112L566 118Q578 120 580 132L582 190Q582 198 572 198L528 198A48 48 0 0 0 432 198L208 198A48 48 0 0 0 112 198Z',
    dark: ['M56 106L48 108Q44 110 44 116L44 156Q44 162 48 164L56 166Z'],
    glass: ['M72 72L150 72L150 108L72 108Z', 'M168 72L262 72L262 108L168 108Z', 'M280 72L386 70L402 108L280 108Z'],
    lines: ['M272 66L272 186', 'M412 112L414 186', 'M160 66L160 150', 'M424 112L566 118', 'M250 124L262 124', 'M394 124L406 124'],
    chrome: ['M576 178L598 178L598 192L578 192'],
    shine: 'M62 140Q320 136 578 146', head: [574, 138, 8], tail: [60, 124], hy: 162
  },
  moto: {
    wheels: [[168, 192, 44, 'wire'], [470, 192, 44, 'disc']],
    under: ['M470 192L444 118', 'M168 192L276 180', 'M420 94L398 84'],
    body: 'M330 128L336 110Q354 94 390 96L418 98Q430 84 448 82L478 120Q492 140 488 156L470 160Q444 150 420 152L402 160L344 156Z' +
      'M428 164Q470 130 514 162L506 167Q470 142 434 169Z',
    touring: 'M104 94Q104 80 118 80L194 80Q208 80 208 94L208 116L112 122Q104 122 104 114Z' +
      'M114 128L230 126Q244 128 242 142L236 166Q232 176 220 176L134 176Q120 176 116 164Z',
    sport: 'M208 120L124 108Q114 108 116 118L122 130L206 134Z',
    dark: ['M206 120Q212 104 234 104L262 110Q278 118 300 116L334 112Q346 114 340 126L232 132Q210 132 206 120Z', 'M268 140L378 138L392 160L380 196L282 196L262 168Z'],
    glass: ['M420 98L432 54Q436 46 444 50L460 84L448 82Q432 84 420 98Z'],
    lines: ['M284 156L378 156', 'M280 170L386 170', 'M284 184L380 184', 'M432 84L424 66'],
    chrome: ['M262 204L118 208'],
    head: [486, 132, 7], tail: [108, 100], hy: 150
  },
  buggy: {
    wheels: [[150, 194, 42, 'tread'], [482, 194, 42, 'tread']],
    under: ['M432 160L482 194', 'M410 170L482 194', 'M230 172L150 194', 'M420 140L468 182'],
    body: 'M70 168L84 140L196 136L222 152L404 152L432 128L548 130Q568 134 572 152L566 170L534 168A58 58 0 0 0 430 168L404 174L222 174L202 168A58 58 0 0 0 98 168Z',
    accent: ['M222 152L404 152L404 160L222 160Z'],
    dark: ['M262 152L258 104Q260 94 270 96L278 152Z', 'M340 152L336 104Q338 94 348 96L356 152Z'],
    lines: ['M214 152L246 74Q250 66 260 66L384 62Q394 62 398 70L424 132', 'M318 64L312 152', 'M246 74L196 136', 'M232 120L410 118', 'M410 112L392 128'],
    head: [560, 142, 5], tail: [78, 152], hy: 160
  },
  jetski: {
    water: true,
    body: 'M86 200Q72 190 74 170L160 164L176 146L344 138L370 112Q380 100 396 104L470 124Q540 140 590 158Q596 164 586 172Q520 196 420 206L120 208Q100 208 86 200Z',
    accent: ['M90 190Q300 194 566 176L576 180Q520 198 420 206L120 208Q100 208 90 190Z'],
    dark: ['M172 146Q180 128 214 126L330 124Q352 126 350 140L176 148Z'],
    glass: ['M396 104L420 86L436 92L430 112Z'],
    lines: ['M386 106L372 80', 'M364 78L382 76', 'M404 100L412 86', 'M470 124L476 142'],
    head: [568, 160, 4], tail: [80, 176], hy: 186
  },
  engin: {
    wheels: [[190, 176, 60, 'tread'], [482, 202, 34, 'steel']],
    body: 'M270 160L270 124Q270 114 280 114L506 116Q532 118 538 140L540 160Z' +
      'M110 176A82 82 0 0 1 270 176L256 176A68 68 0 0 0 124 176Z' + 'M126 50L304 50L304 60L126 60Z',
    glass: ['M150 62L284 62L276 150L158 150Z'],
    lines: ['M140 60L150 160', 'M292 60L280 160', 'M470 116L470 70', 'M462 70L478 70', 'M530 126L530 156', 'M520 124L520 156', 'M300 136L500 136'],
    chrome: ['M540 150L556 150L556 166L540 166'],
    head: [532, 122, 6], tail: [118, 120], hy: 146
  }
};

function wheel(x, y, r, style, L, F, P) {
  const rim = r * (style === 'tread' ? 0.58 : 0.64);
  let out = F(circ(x, y, r), P.tire) + L(circ(x, y, r)) + F(circ(x, y, rim), P.rim) + L(circ(x, y, rim), 'stroke-width="1.2"');
  const n = style === 'wire' ? 16 : style === 'disc' ? 0 : style === 'steel' ? 0 : style === 'tread' ? 6 : 5;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    d += `M${f(x + Math.cos(a) * r * 0.16)} ${f(y + Math.sin(a) * r * 0.16)}L${f(x + Math.cos(a) * rim)} ${f(y + Math.sin(a) * rim)}`;
  }
  if (d) out += L(d, `stroke-width="${style === 'wire' ? 0.7 : 1.4}" stroke-opacity=".6"`);
  if (style === 'disc') out += L(circ(x, y, rim * 0.62), 'stroke-opacity=".5" stroke-width="1"');
  if (style === 'steel') for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; out += F(circ(f(x + Math.cos(a) * rim * 0.55), f(y + Math.sin(a) * rim * 0.55), 2.6), P.hub, 'fill-opacity=".45"'); }
  if (style === 'tread') out += `<path class="va-f" d="${circ(x, y, r - 3.5)}" fill="none" stroke="${P.tread}" stroke-opacity=".35" stroke-width="3" stroke-dasharray="3 5"/>`;
  return out + F(circ(x, y, r * 0.15), P.hub, 'fill-opacity=".75"');
}

export function vehicleArt(v, opts = {}) {
  v = v || {};
  const tone = opts.tone === 'cream' ? 'cream' : 'ink';
  const ink = tone === 'ink';
  const P = TONES[tone];
  const kind = shapeOf(v);
  const s = SHAPES[kind];
  const id = 'va' + (++seq);
  const raw = paintColor(v);
  const paint = ink ? aged(raw) : raw;
  const accent = ink ? aged(accentColor(v, P.accent)) : accentColor(v, P.accent);
  const detail = isLight(paint) ? P.detailLight : P.detailDark;
  const ground = 236;
  let k = 0;
  const L = (d, extra = '') => `<path class="va-l" pathLength="1" style="--k:${k++}" d="${d}" ${extra}/>`;
  const F = (d, fill, extra = '') => `<path class="va-f" d="${d}" fill="${fill}" stroke="none" ${extra}/>`;

  let body = s.body;
  if (kind === 'moto') body += /gold ?wing|gl1|touring|electra|k1600|\brt\b/i.test((v.make || '') + ' ' + (v.model || '')) ? s.touring : s.sport;

  let out = '';
  if (ink) {
    out += `<defs><pattern id="${id}x" width="4.5" height="4.5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><path d="M0 0V4.5" stroke="#221D18" stroke-width="1" stroke-opacity=".34"/></pattern>` +
      `<pattern id="${id}g" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-56)"><path d="M0 0V7" stroke="#221D18" stroke-width=".8" stroke-opacity=".28"/></pattern>` +
      `<clipPath id="${id}c"><path d="${body}"/></clipPath></defs>`;
    if (!s.water) {
      out += `<path class="va-f" d="M96 241L548 241M132 246L508 246M176 251L462 251M226 256L410 256" stroke-opacity=".32" stroke-width="1"/>`;
    }
  } else {
    out += `<defs><radialGradient id="${id}s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
      `<linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(paint, '#FFFFFF', 0.22)}"/><stop offset=".55" stop-color="${paint}"/><stop offset="1" stop-color="${mix(paint, '#000000', 0.45)}"/></linearGradient>` +
      `<radialGradient id="${id}h" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${CREAM}" stop-opacity=".55"/><stop offset="1" stop-color="${CREAM}" stop-opacity="0"/></radialGradient></defs>`;
    out += `<ellipse class="va-f" cx="320" cy="${s.water ? 214 : ground + 2}" rx="${s.water ? 290 : 270}" ry="${s.water ? 9 : 13}" fill="url(#${id}s)" stroke="none"/>`;
  }

  if (s.water) {
    out += L('M16 214Q56 206 96 214T176 214T256 214T336 214T416 214T496 214T576 214T624 212', 'stroke-opacity=".45" stroke-width="1.2"');
    out += L('M60 226Q100 220 140 226T220 226T300 226T380 226T460 226T540 226', 'stroke-opacity=".22" stroke-width="1"');
    out += L('M74 196L36 186M70 204L28 202M78 208L44 216', 'stroke-opacity=".5" stroke-width="1"');
  } else {
    out += L(`M24 ${ground}L616 ${ground}`, `stroke-opacity="${ink ? '.5' : '.28'}" stroke-width="1"`);
  }
  (s.wheels || []).forEach(([x, y, r, st]) => { out += wheel(x, y, r, st || (v.category === 'Classique' ? 'wire' : 'five'), L, F, P); });
  (s.under || []).forEach((d) => { out += L(d, `stroke-width="3.2" stroke="${P.under}"`); });
  out += F(body, ink ? paint : `url(#${id}p)`);
  if (ink) out += `<rect class="va-f" x="0" y="${s.hy}" width="640" height="${280 - s.hy}" fill="url(#${id}x)" stroke="none" clip-path="url(#${id}c)"/>`;
  (s.accent || []).forEach((d) => { out += F(d, accent, 'fill-opacity=".9"'); });
  (s.dark || []).forEach((d) => { out += F(d, P.dark) + L(d, 'stroke-opacity=".55" stroke-width="1.1"'); });
  (s.glass || []).forEach((d) => {
    out += ink ? F(d, P.glass) + F(d, `url(#${id}g)`) + L(d, 'stroke-width="1.2"') : F(d, P.glass, 'fill-opacity=".88"') + L(d, 'stroke-width="1.2"');
  });
  if (s.shine) out += `<path class="va-f" d="${s.shine}" fill="none" stroke="${ink ? '#F7F0DF' : '#FFFFFF'}" stroke-opacity="${ink ? '.38' : '.22'}" stroke-width="${ink ? 1.4 : 2}" stroke-linecap="round"/>`;
  out += L(body, `stroke-width="${ink ? 1.8 : 1.7}"`);
  (s.lines || []).forEach((d) => { out += L(d, `stroke="${['coupe', 'roadster', 'saloon', 'boxy'].includes(kind) ? detail : P.alt}" stroke-width="${kind === 'buggy' ? 3 : 1.2}"`); });
  (s.chrome || []).forEach((d) => { out += L(d, 'stroke-width="3.4" stroke-opacity=".7"'); });
  if (s.head) {
    const [hx, hy, hr] = s.head;
    out += ink ? F(circ(hx, hy, hr), '#F7F0DF') + L(circ(hx, hy, hr), 'stroke-width="1.2"')
      : `<circle class="va-f" cx="${hx}" cy="${hy}" r="${hr * 3.2}" fill="url(#${id}h)" stroke="none"/>` + F(circ(hx, hy, hr), CREAM, 'fill-opacity=".95"');
  }
  if (s.tail) out += F(`M${s.tail[0] - 3} ${s.tail[1] - 5}h7v11h-7Z`, P.tail);

  const cls = ['va', 'va-' + kind, 'va-' + tone, opts.animate ? 'va-animate' : '', opts.className || ''].filter(Boolean).join(' ');
  const a11y = opts.label ? `role="img" aria-label="${String(opts.label).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}"` : 'aria-hidden="true"';
  return `<svg class="${cls}" viewBox="0 0 640 280" width="100%" preserveAspectRatio="xMidYMid meet" style="aspect-ratio:640/280;height:auto" xmlns="http://www.w3.org/2000/svg" ${a11y}>` +
    `<g fill="none" stroke="${P.stroke}" stroke-opacity="${P.strokeOp}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${out}</g></svg>`;
}
