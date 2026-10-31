// Original flat illustrations (ink outline, flat fills). All drawn for this demo brand.
const K = '#010101'
const S = { stroke: K, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' }
const C = { cream: '#fff7e9', page: '#fffcf3', yellow: '#fdcd62', red: '#f04a49', sky: '#73c3f5', blue: '#387cc0', sage: '#c7e0c3', green: '#3ba76b', navy: '#272d45', coral: '#ff8a6b', silver: '#dbe4ee', lemon: '#ffe27a', bread: '#e9b872' }

/* ---------- Species (drawn in a 200x100 box, centred at 100,50) ---------- */
const Fish = {
  Sardines: (
    <g>
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(0 ${i * 26 - 12})`}>
          <path d="M28 50c22-16 82-20 122-4l22-14v36l-22-14c-40 16-100 12-122-4z" fill={C.silver} {...S} />
          <path d="M40 50c30 6 70 6 104-2" fill="none" stroke={C.blue} strokeWidth="4" strokeLinecap="round" />
          <circle cx="46" cy="46" r="4" fill={K} />
        </g>
      ))}
    </g>
  ),
  Salmon: (
    <g>
      <path d="M30 34c30-16 110-16 140 0 8 20 8 30 0 46-30 14-110 14-140 0-8-16-8-30 0-46z" fill={C.coral} {...S} />
      {[52, 78, 104, 130, 156].map((x) => <path key={x} d={`M${x} 24c-10 16-10 44 0 60`} fill="none" stroke={C.page} strokeWidth="5" strokeLinecap="round" />)}
    </g>
  ),
  Tuna: (
    <g>
      <path d="M22 52c26-30 96-36 136-10l26-22-6 32 6 32-26-22c-40 26-110 20-136-10z" fill={C.navy} {...S} />
      <path d="M30 56c36 16 90 18 126-4" fill="none" stroke={C.silver} strokeWidth="10" strokeLinecap="round" />
      <path d="M86 30l10-14 12 12M98 74l8 12 10-10" fill={C.yellow} {...S} strokeWidth="3" />
      <circle cx="42" cy="46" r="5" fill={C.page} stroke={K} strokeWidth="3" />
    </g>
  ),
  Anchovies: (
    <g>
      {[-18, 0, 18].map((y) => (
        <g key={y} transform={`translate(0 ${y})`}>
          <path d="M24 50c30-8 100-10 140-2l14-8v20l-14-8c-40 8-110 6-140-2z" fill="#8a96a8" {...S} strokeWidth="3" />
          <circle cx="34" cy="49" r="2.5" fill={K} />
        </g>
      ))}
    </g>
  ),
  Mackerel: (
    <g>
      <path d="M24 50c24-22 92-28 130-8l24-16v48l-24-16c-38 20-106 14-130-8z" fill={C.green} {...S} />
      <path d="M30 56c36 14 90 14 122-4v8c-34 16-88 14-122-4z" fill={C.silver} stroke="none" />
      {[56, 76, 96, 116, 136].map((x) => <path key={x} d={`M${x} 34q6 6 0 12t0 12`} fill="none" stroke={K} strokeWidth="3" strokeLinecap="round" />)}
      <circle cx="40" cy="46" r="4.5" fill={C.page} stroke={K} strokeWidth="3" />
    </g>
  ),
  Mussels: (
    <g>
      {[[60, -6], [130, 6]].map(([x, r]) => (
        <g key={x} transform={`rotate(${r} ${x} 50)`}>
          <path d={`M${x} 14c26 0 40 30 34 56-4 18-22 24-34 24s-30-6-34-24c-6-26 8-56 34-56z`} fill={C.navy} {...S} />
          <path d={`M${x - 16} 46c8 20 24 20 32 0`} fill={C.coral} {...S} strokeWidth="3" />
          {[0, 1, 2].map((k) => <path key={k} d={`M${x - 22 + k * 6} ${30 + k * 6}q${22 - k * 6} -10 ${44 - k * 12} 0`} fill="none" stroke="#5a6488" strokeWidth="2.5" />)}
        </g>
      ))}
    </g>
  ),
}

/* ---------- Packaging ---------- */
function TinShape({ a, label, fish, x = 60, y = 110, w = 280, h = 180, rot = -6 }) {
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x + 8} y={y + 10} width={w} height={h} rx="34" fill={K} opacity=".18" />
      <rect x={x} y={y} width={w} height={h} rx="34" fill={a} {...S} />
      <rect x={x + 14} y={y + 14} width={w - 28} height={h - 28} rx="24" fill="none" stroke={K} strokeWidth="2.5" strokeDasharray="2 7" />
      <rect x={x + 30} y={y + h - 56} width={w - 60} height="34" rx="8" fill={C.page} {...S} strokeWidth="3" />
      <text x={x + w / 2} y={y + h - 33} textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="700" fontSize="17" letterSpacing="2" fill={K}>{label}</text>
      <g transform={`translate(${x + w / 2 - 80} ${y + 12}) scale(.8)`}>{fish}</g>
    </g>
  )
}

function Pattern({ bg, kind = 'dots' }) {
  return (
    <>
      <rect width="400" height="400" fill={bg} />
      {kind === 'dots' && Array.from({ length: 36 }, (_, i) => <circle key={i} cx={(i % 6) * 72 + 20 + ((i / 6) | 0) % 2 * 36} cy={((i / 6) | 0) * 72 + 18} r="4" fill={K} opacity=".12" />)}
      {kind === 'waves' && [40, 120, 200, 280, 360].map((y) => <path key={y} d={`M-10 ${y}q25-14 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0 50 0`} fill="none" stroke={K} strokeWidth="3" opacity=".12" />)}
    </>
  )
}

const Sparkle = ({ x, y, s = 1, fill = C.yellow }) => <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-16 4-4 16 0 4 4 0 16-4 4-16 0-4-4z" fill={fill} stroke={K} strokeWidth="2.5" strokeLinejoin="round" />

const Products = {
  calendar: ({ a }) => (
    <g>
      <rect x="78" y="58" width="252" height="300" rx="18" fill={K} opacity=".18" />
      <rect x="70" y="50" width="252" height="300" rx="18" fill={a} {...S} />
      <rect x="90" y="70" width="212" height="50" rx="10" fill={C.page} {...S} strokeWidth="3" />
      <text x="196" y="103" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="700" fontSize="22" fill={K}>7 DOORS</text>
      {Array.from({ length: 6 }, (_, i) => {
        const x = 92 + (i % 3) * 72, y = 138 + ((i / 3) | 0) * 96
        return <g key={i}><rect x={x} y={y} width="62" height="84" rx="8" fill={[C.yellow, C.sky, C.sage, C.coral, C.page, C.yellow][i]} {...S} strokeWidth="3" /><text x={x + 31} y={y + 52} textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="700" fontSize="28" fill={K}>{i + 1}</text></g>
      })}
      <path d="M236 234v84l-30 14v-84z" fill={C.page} {...S} strokeWidth="3" />
      <Sparkle x="340" y="70" />
      <Sparkle x="52" y="320" s=".8" fill={C.sky} />
    </g>
  ),
  box: ({ a }) => (
    <g>
      <rect x="88" y="168" width="240" height="180" rx="10" fill={K} opacity=".18" />
      <rect x="80" y="160" width="240" height="180" rx="10" fill={a} {...S} />
      <rect x="66" y="120" width="268" height="52" rx="10" fill={a} {...S} />
      <rect x="184" y="120" width="32" height="220" fill={C.yellow} {...S} />
      <path d="M200 120c-30-50-80-30-60 0zM200 120c30-50 80-30 60 0z" fill={C.yellow} {...S} />
      <circle cx="200" cy="120" r="12" fill={C.coral} {...S} />
      <Sparkle x="330" y="96" />
      <Sparkle x="70" y="90" s=".7" fill={C.sky} />
    </g>
  ),
  stack: ({ a }) => (
    <g>
      <TinShape a={C.sky} label="SARDINES" fish={Fish.Sardines} x={70} y={210} w={220} h={130} rot={4} />
      <TinShape a={a} label="TUNA" fish={Fish.Tuna} x={110} y={130} w={220} h={130} rot={-5} />
      <TinShape a={C.coral} label="SALMON" fish={Fish.Salmon} x={80} y={50} w={220} h={130} rot={3} />
    </g>
  ),
  fork: () => (
    <g>
      <ellipse cx="200" cy="220" rx="150" ry="120" fill={C.page} {...S} />
      <ellipse cx="200" cy="220" rx="110" ry="84" fill="none" stroke={K} strokeWidth="2.5" strokeDasharray="3 9" />
      <g transform="rotate(-35 200 210)">
        <rect x="190" y="150" width="20" height="170" rx="10" fill={C.yellow} {...S} />
        <path d="M180 80v60c0 14 40 14 40 0V80" fill="none" stroke={K} strokeWidth="12" strokeLinecap="round" />
        <path d="M180 80v60c0 14 40 14 40 0V80" fill="none" stroke={C.yellow} strokeWidth="5" strokeLinecap="round" />
      </g>
    </g>
  ),
  hat: ({ a }) => (
    <g>
      <ellipse cx="200" cy="272" rx="160" ry="40" fill={K} opacity=".18" />
      <ellipse cx="200" cy="262" rx="160" ry="40" fill={a} {...S} />
      <path d="M100 258c0-80 30-140 100-140s100 60 100 140c-60 20-140 20-200 0z" fill={a} {...S} />
      <path d="M108 220c60 14 124 14 184 0" fill="none" stroke={K} strokeWidth="3" strokeDasharray="4 7" />
      <g transform="translate(136 150) scale(.65)">{Fish.Sardines}</g>
    </g>
  ),
  book: ({ a }) => (
    <g>
      <rect x="108" y="58" width="200" height="290" rx="8" fill={K} opacity=".18" />
      <rect x="100" y="50" width="200" height="290" rx="8" fill={a} {...S} />
      <rect x="100" y="50" width="24" height="290" fill={K} opacity=".15" />
      <rect x="138" y="80" width="140" height="56" rx="6" fill={C.page} {...S} strokeWidth="3" />
      <text x="208" y="104" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="700" fontSize="17" fill={K}>OPEN</text>
      <text x="208" y="126" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="700" fontSize="17" fill={K}>THE TIN</text>
      <TinShape a={C.yellow} label="" fish={Fish.Sardines} x={140} y={180} w={136} h={96} rot={-8} />
    </g>
  ),
}

/* ---------- Scenes for non-product placeholders ---------- */
const Scenes = {
  hero: ({ a, b }) => (
    <g>
      <rect x="-2000" y="-2000" width="4400" height="4400" fill={b} />
      <rect x="-2000" y="270" width="4400" height="2130" fill={K} opacity=".12" />
      <ellipse cx="80" cy="286" rx="54" ry="26" fill={C.bread} {...S} />
      <path d="M40 280c20-10 60-10 80 0" fill="none" stroke={K} strokeWidth="3" />
      <circle cx="330" cy="280" r="34" fill={C.lemon} {...S} />
      <path d="M330 248v64M298 280h64M307 257l46 46M353 257l-46 46" stroke={K} strokeWidth="2.5" />
      <TinShape a={a} label="SARDINES" fish={Fish.Sardines} x={110} y={140} w={190} h={130} rot={-4} />
      <Sparkle x="70" y="90" /><Sparkle x="340" y="120" s=".8" fill={C.sky} /><Sparkle x="210" y="70" s=".6" />
    </g>
  ),
  dish: ({ b }) => (
    <g>
      <rect x="-2000" y="-2000" width="4400" height="4400" fill={b} />
      <circle cx="200" cy="200" r="150" fill={C.page} {...S} />
      <circle cx="200" cy="200" r="112" fill={C.cream} stroke={K} strokeWidth="2.5" />
      <path d="M130 210c30-40 110-40 140 0-30 30-110 30-140 0z" fill={C.coral} {...S} />
      {[160, 190, 220, 250].map((x) => <path key={x} d={`M${x} 186c-6 10-6 34 0 44`} fill="none" stroke={C.page} strokeWidth="4" strokeLinecap="round" />)}
      {[[150, 150], [250, 150], [140, 260], [262, 256]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="12" fill={[C.green, C.lemon, C.red, C.green][i]} {...S} strokeWidth="3" />)}
      <path d="M180 140q20-20 40 0M176 270q24 16 48 0" fill="none" stroke={C.green} strokeWidth="5" strokeLinecap="round" />
    </g>
  ),
  boat: ({ b }) => (
    <g>
      <rect x="-2000" y="-2000" width="4400" height="4400" fill={C.sky} />
      <circle cx="320" cy="90" r="40" fill={C.yellow} {...S} />
      <rect x="60" y="120" width="90" height="110" fill={C.page} {...S} />
      <path d="M50 124l55-50 55 50z" fill={C.red} {...S} />
      <rect x="92" y="180" width="26" height="50" fill={C.bread} {...S} strokeWidth="3" />
      <path d="M150 230h40" stroke={K} strokeWidth="4" />
      <rect x="-2000" y="230" width="4400" height="2170" fill={C.blue} />
      {[262, 310, 358].map((y) => <path key={y} d={`M-410 ${y}${'q25-14 50 0t50 0'.repeat(1)}${' 50 0'.repeat(22)}`} fill="none" stroke={C.page} strokeWidth="4" opacity=".6" />)}
      <path d="M200 236h150l-26 40H226z" fill={b} {...S} />
      <rect x="250" y="196" width="50" height="40" fill={C.page} {...S} strokeWidth="3" />
      <path d="M275 196v-60M275 140l40 30h-40" fill={C.page} {...S} strokeWidth="3" />
    </g>
  ),
  map: () => (
    <g>
      <rect x="-2000" y="-2000" width="4400" height="4400" fill={C.sky} />
      {[-40, 60, 160, 260, 360, 460].map((y) => <path key={y} d={`M-600 ${y}${'q25-10 50 0t50 0'.repeat(1)}${' 50 0'.repeat(30)}`} fill="none" stroke={C.page} strokeWidth="2" opacity=".35" />)}
      <path d="M40 80c60-40 140 10 200-20s120 10 130 70-30 90-10 150-60 90-140 70-120 10-160-40-60-180-20-230z" fill={C.sage} {...S} />
      <path d="M70 180c80 10 140-40 260-10M120 90c20 80 0 160 40 250M240 70c-10 90 40 170 20 260" fill="none" stroke={C.page} strokeWidth="6" strokeLinecap="round" />
      {[[130, 150], [250, 210], [180, 300], [300, 120], [90, 260]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}><path d="M0 0c-14-18-14-36 0-36s14 18 0 36z" fill={i % 2 ? C.red : C.yellow} {...S} strokeWidth="3" /><circle cy="-24" r="5" fill={C.page} stroke={K} strokeWidth="2" /></g>
      ))}
    </g>
  ),
  banner: ({ a, b }) => (
    <g>
      <rect x="-2000" y="-2000" width="4400" height="4400" fill={b} />
      {[-1200, -800, -400, 0, 400, 800, 1200].map((dx, i) => (
        <g key={dx} transform={`translate(${dx} 0)`}>
          <TinShape a={C.coral} label="SALMON" fish={Fish.Salmon} x={10} y={150} w={170} h={110} rot={-10} />
          <TinShape a={i % 2 ? C.sage : a} label="TUNA" fish={Fish.Tuna} x={115} y={120} w={170} h={110} rot={6} />
          <TinShape a={C.sky} label="SARDINES" fish={Fish.Sardines} x={220} y={160} w={170} h={110} rot={-4} />
          <Sparkle x="60" y="80" /><Sparkle x="350" y="90" s=".8" fill={C.page} />
        </g>
      ))}
    </g>
  ),
}

const artFor = (p) => p?.art || ({ 'countdown-calendar': 'calendar', 'dinner-party-box': 'box', 'starter-trio': 'stack', 'bundle-builder': 'stack', 'serving-fork': 'fork', 'bucket-hat': 'hat', cookbook: 'book' })[p?.slug]

export function Illustration({ p, scene }) {
  const [a, b] = p?.tin || [C.yellow, C.sky]
  const Scene = scene && Scenes[scene]
  const art = artFor(p)
  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio={Scene ? (scene === 'hero' ? 'xMaxYMid meet' : 'xMidYMid meet') : 'xMidYMid slice'} overflow={Scene ? 'visible' : undefined} className="art" aria-hidden>
      {Scene ? <Scene a={a} b={b} /> : (
        <>
          <Pattern bg={b} kind={p?.fish === 'Mussels' || p?.fish === 'Anchovies' ? 'waves' : 'dots'} />
          {art ? Products[art]({ a, b }) : <TinShape a={a} label={(p?.fish || 'TINNED').toUpperCase()} fish={Fish[p?.fish] || Fish.Sardines} />}
        </>
      )}
    </svg>
  )
}

/* ---------- UI icons (24px grid, 1.6 stroke) ---------- */
const L = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
const mk = (d) => function UiIcon(props) { return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...L} {...props}>{d}</svg> }
export const UI = {
  truck: mk(<><path d="M2 6h11v10H2zM13 9h4l3 3v4h-7" /><circle cx="6" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" /></>),
  gift: mk(<><path d="M3 9h18v4H3zM5 13h14v8H5zM12 9v12" /><path d="M12 9C9 9 7 4 10 4s2 5 2 5 0-5 2-5 1 5-2 5" /></>),
  back: mk(<><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></>),
  lock: mk(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  flame: mk(<path d="M12 22c4 0 7-3 7-7 0-5-4-6-5-11-2 3-2 5-1 7-2-1-3-3-3-5-3 3-5 6-5 9 0 4 3 7 7 7z" />),
  check: mk(<path d="m5 12 5 5 9-10" />),
  mail: mk(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>),
  party: mk(<><path d="M4 20 8 8l8 8z" /><path d="M14 4v2M19 6l-1.5 1.5M20 11h-2M11 3l.5 2" /></>),
  bolt: mk(<path d="M13 2 4 14h7l-1 8 9-12h-7z" />),
  thumb: mk(<><path d="M7 10v11H3V10z" /><path d="M7 10l4-8c2 0 3 1 3 3v4h5a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 20H7" /></>),
  fish: mk(<><path d="M2 12c3-4 9-5 13-2l5-3v10l-5-3c-4 3-10 2-13-2z" /><circle cx="7" cy="11.5" r=".6" fill="currentColor" /></>),
  pause: mk(<path d="M9 5v14M15 5v14" strokeWidth="2.4" />),
  play: mk(<path d="M7 4v16l13-8z" fill="currentColor" />),
  dash: mk(<><rect x="3" y="3" width="8" height="10" rx="1.5" /><rect x="13" y="3" width="8" height="6" rx="1.5" /><rect x="13" y="11" width="8" height="10" rx="1.5" /><rect x="3" y="15" width="8" height="6" rx="1.5" /></>),
  receipt: mk(<><path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z" /><path d="M9 7h6M9 11h6M9 15h4" /></>),
  users: mk(<><circle cx="9" cy="8" r="3.5" /><path d="M2 20c1-4 4-6 7-6s6 2 7 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 1 3.5 3 4 6" /></>),
  tag: mk(<><path d="M3 12V3h9l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.5" /></>),
  gear: mk(<><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>),
  contrast: mk(<><circle cx="12" cy="12" r="9" /><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" /></>),
  text: mk(<path d="M4 18 9 6l5 12M5.5 14h7M15 18l3-7 3 7M16 16h4" />),
  motion: mk(<><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></>),
  moon: mk(<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z" />),
  arrowDown: mk(<path d="M12 4v16m-6-6 6 6 6-6" />),
  star: mk(<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />),
}
