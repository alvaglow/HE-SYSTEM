// HE-SYSTEM — Shared UI Components
const { useState, useEffect, useRef } = React;

const HEIcon = ({ name, size = 20, color = 'currentColor' }) => {
  const path = window.HE_ICONS?.[name] || '';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
      <path d={path} />
    </svg>
  );
};

const HEAvatar = ({ name = '', size = 36, color }) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const palette = ['#1B3D8C','#DC2626','#D97706','#16A34A','#7C3AED','#0EA5E9','#DB2777'];
  const bg = color || palette[name.charCodeAt(0) % palette.length];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, display:'flex',
      alignItems:'center', justifyContent:'center', color:'#fff', fontSize:size*0.36,
      fontWeight:700, fontFamily:'Oswald, sans-serif', flexShrink:0 }}>
      {initials}
    </div>
  );
};

const HEBadge = ({ children, variant = 'blue', dot = false }) => {
  const variants = {
    blue:   { bg:'rgba(27,61,140,0.18)',   color:'#93B4FF', border:'rgba(27,61,140,0.35)' },
    red:    { bg:'rgba(220,38,38,0.15)',    color:'#FCA5A5', border:'rgba(220,38,38,0.3)' },
    gold:   { bg:'rgba(245,158,11,0.15)',   color:'#FCD34D', border:'rgba(245,158,11,0.3)' },
    green:  { bg:'rgba(22,163,74,0.15)',    color:'#86EFAC', border:'rgba(22,163,74,0.3)' },
    slate:  { bg:'rgba(100,116,139,0.15)',  color:'#94A3B8', border:'rgba(100,116,139,0.3)' },
    purple: { bg:'rgba(124,58,237,0.15)',   color:'#C4B5FD', border:'rgba(124,58,237,0.3)' },
    campus: { bg:'rgba(27,61,140,0.18)',    color:'#93B4FF', border:'rgba(27,61,140,0.35)' },
    remote: { bg:'rgba(14,165,233,0.15)',   color:'#7DD3FC', border:'rgba(14,165,233,0.3)' },
    active: { bg:'rgba(22,163,74,0.15)',    color:'#86EFAC', border:'rgba(22,163,74,0.3)' },
    pending:{ bg:'rgba(245,158,11,0.15)',   color:'#FCD34D', border:'rgba(245,158,11,0.3)' },
    inactive:{bg:'rgba(100,116,139,0.15)', color:'#94A3B8', border:'rgba(100,116,139,0.3)' },
    overdue:{ bg:'rgba(220,38,38,0.15)',    color:'#FCA5A5', border:'rgba(220,38,38,0.3)' },
    paid:   { bg:'rgba(22,163,74,0.15)',    color:'#86EFAC', border:'rgba(22,163,74,0.3)' },
    enrolled:{bg:'rgba(22,163,74,0.15)',    color:'#86EFAC', border:'rgba(22,163,74,0.3)' },
    present:{ bg:'rgba(22,163,74,0.15)',    color:'#86EFAC', border:'rgba(22,163,74,0.3)' },
    absent: { bg:'rgba(220,38,38,0.15)',    color:'#FCA5A5', border:'rgba(220,38,38,0.3)' },
    late:   { bg:'rgba(245,158,11,0.15)',   color:'#FCD34D', border:'rgba(245,158,11,0.3)' },
  };
  const v = variants[variant] || variants.slate;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px',
      borderRadius:9999, background:v.bg, color:v.color, border:`1px solid ${v.border}`,
      fontSize:11, fontWeight:600, letterSpacing:'0.02em', whiteSpace:'nowrap' }}>
      {dot && <span style={{ width:5, height:5, borderRadius:'50%', background:v.color }} />}
      {children}
    </span>
  );
};

const HEStatCard = ({ icon, value, label, trend, accent = '#1B3D8C', format = 'number', sub }) => {
  const [disp, setDisp] = useState(0);
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;
  useEffect(() => {
    let start = 0, frames = 0;
    const total = 40;
    const step = () => {
      frames++;
      const progress = frames / total;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisp(num * eased);
      if (frames < total) requestAnimationFrame(step);
      else setDisp(num);
    };
    requestAnimationFrame(step);
  }, [num]);

  const fmt = (v) => {
    if (format === 'currency') return 'RM ' + Math.round(v).toLocaleString();
    if (format === 'percent') return Math.round(v) + '%';
    if (format === 'decimal') return v.toFixed(2);
    if (v >= 1000000) return (v/1000000).toFixed(1)+'M';
    if (v >= 1000) return (v/1000).toFixed(1)+'K';
    return Math.round(v).toString();
  };

  const iconBg = accent + '22';
  const iconColor = accent === '#1B3D8C' ? '#93B4FF' : accent === '#DC2626' ? '#FCA5A5' :
    accent === '#F59E0B' ? '#FCD34D' : accent === '#16A34A' ? '#86EFAC' : accent;

  return (
    <div style={{ background:'var(--surface)', borderRadius:12, padding:'18px 20px',
      border:'1px solid var(--border)', position:'relative', overflow:'hidden',
      transition:'transform 200ms, box-shadow 200ms', cursor:'default' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
      <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:accent, borderRadius:'12px 0 0 12px' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase',
            letterSpacing:'0.06em', marginBottom:8, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {label}
          </div>
          <div style={{ color:'var(--text1)', fontSize:26, fontWeight:700, fontFamily:'Oswald, sans-serif', lineHeight:1 }}>
            {fmt(disp)}
          </div>
          {sub && <div style={{ color:'var(--text3)', fontSize:11, marginTop:4 }}>{sub}</div>}
          {trend !== undefined && (
            <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:3, fontSize:11,
              color: trend >= 0 ? '#86EFAC' : '#FCA5A5' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d={trend >= 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
              </svg>
              {Math.abs(trend)}% vs last month
            </div>
          )}
        </div>
        <div style={{ width:42, height:42, borderRadius:10, background:iconBg, display:'flex',
          alignItems:'center', justifyContent:'center', color:iconColor, flexShrink:0 }}>
          <HEIcon name={icon} size={20} />
        </div>
      </div>
    </div>
  );
};

const HEProgress = ({ value, max = 100, color = '#1B3D8C', height = 6 }) => {
  const [w, setW] = useState(0);
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  useEffect(() => { const t = setTimeout(() => setW(pct), 120); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ width:'100%', background:'var(--border-track, rgba(255,255,255,0.08))',
      borderRadius:9999, height, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${w}%`, background:color, borderRadius:9999,
        transition:'width 700ms cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  );
};

const HEPillar = ({ p }) => {
  const gc = window.gradeColor(p.grade);
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12,
      padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color:'var(--text1)', fontWeight:600, fontSize:14 }}>{p.name}</div>
          <div style={{ color:'var(--text3)', fontSize:11, marginTop:2 }}>Weight: {p.weight}% of KPI</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:22, fontWeight:800, fontFamily:'Oswald', color:gc }}>{p.grade}</div>
          <div style={{ fontSize:12, color:'var(--text2)' }}>{p.score}/100</div>
        </div>
      </div>
      <HEProgress value={p.score} color={p.color || gc} />
      <div style={{ fontSize:11, color:'var(--text3)' }}>
        Contributes <strong style={{ color:'var(--text2)' }}>{((p.weight / 100) * p.score).toFixed(1)} pts</strong> to overall KPI
      </div>
    </div>
  );
};

const HETier = ({ tier, size = 'md' }) => {
  const tiers = {
    starter:  { label:'Starter',  color:'#94A3B8', emoji:'⚪' },
    bronze:   { label:'Bronze',   color:'#CD7F32', emoji:'🥉' },
    silver:   { label:'Silver',   color:'#C0C0C0', emoji:'🥈' },
    gold:     { label:'Gold',     color:'#F59E0B', emoji:'🥇' },
    platinum: { label:'Platinum', color:'#A78BFA', emoji:'💎' },
  };
  const t = tiers[tier] || tiers.starter;
  const lg = size === 'lg';
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap: lg ? 8 : 6,
      padding: lg ? '8px 18px' : '4px 10px', borderRadius:9999,
      background: t.color + '20', border:`1.5px solid ${t.color}50`, color:t.color }}>
      <span style={{ fontSize: lg ? 22 : 14 }}>{t.emoji}</span>
      <span style={{ fontWeight:700, fontFamily:'Oswald', fontSize: lg ? 17 : 12, letterSpacing:'0.03em' }}>
        {t.label.toUpperCase()}
      </span>
    </div>
  );
};

const HEBarChart = ({ data, labels, color = '#1B3D8C', height = 110 }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);
  const max = Math.max(...data);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height: height + 28, padding:'0 4px' }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
          gap:4, height:'100%', justifyContent:'flex-end' }}>
          <div style={{ fontSize:9, color:'var(--text3)', fontWeight:600, fontFamily:'Oswald' }}>
            {v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v}
          </div>
          <div style={{ width:'100%', background: i === data.length-1 ? color : color+'99',
            borderRadius:'4px 4px 0 0',
            height: mounted ? `${(v / max) * height}px` : '0px',
            transition:`height ${600 + i * 60}ms cubic-bezier(0.4,0,0.2,1)`,
            position:'relative', overflow:'hidden' }}>
            {i === data.length-1 && (
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)' }} />
            )}
          </div>
          <div style={{ fontSize:9, color:'var(--text3)', whiteSpace:'nowrap', fontWeight:600 }}>{labels?.[i]}</div>
        </div>
      ))}
    </div>
  );
};

const HESectionLabel = ({ children }) => (
  <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase',
    letterSpacing:'0.07em', marginBottom:12 }}>
    {children}
  </div>
);

const HECard = ({ children, accent, hoverable, style = {} }) => (
  <div style={{ background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:12, overflow:'hidden', position:'relative',
    transition:'transform 200ms, box-shadow 200ms', ...style }}
    onMouseEnter={hoverable ? e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.2)'; } : undefined}
    onMouseLeave={hoverable ? e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; } : undefined}>
    {accent && <div style={{ height:3, background:accent, position:'absolute', top:0, left:0, right:0 }} />}
    <div style={{ paddingTop: accent ? 3 : 0 }}>{children}</div>
  </div>
);

const HEBtn = ({ children, variant = 'primary', icon, onClick, small, style = {} }) => {
  const variants = {
    primary: { bg:'#1B3D8C', color:'#fff', border:'transparent',
      hover:'#2E5FCC' },
    secondary: { bg:'rgba(27,61,140,0.12)', color:'#93B4FF', border:'rgba(27,61,140,0.3)',
      hover:'rgba(27,61,140,0.22)' },
    danger: { bg:'rgba(220,38,38,0.12)', color:'#FCA5A5', border:'rgba(220,38,38,0.3)',
      hover:'rgba(220,38,38,0.2)' },
    gold: { bg:'rgba(245,158,11,0.12)', color:'#FCD34D', border:'rgba(245,158,11,0.3)',
      hover:'rgba(245,158,11,0.22)' },
    ghost: { bg:'transparent', color:'var(--text2)', border:'transparent',
      hover:'var(--surface2)' },
  };
  const v = variants[variant] || variants.primary;
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:'inline-flex', alignItems:'center', gap:6, padding: small ? '6px 12px' : '8px 16px',
        borderRadius:8, background: hov ? v.hover : v.bg, color:v.color,
        border:`1px solid ${v.border}`, fontSize: small ? 12 : 13, fontWeight:600, cursor:'pointer',
        transition:'all 150ms', fontFamily:'inherit', ...style }}>
      {icon && <HEIcon name={icon} size={small ? 14 : 16} />}
      {children}
    </button>
  );
};

const HEComingSoon = ({ name }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    padding:'80px 24px', gap:16, textAlign:'center' }}>
    <div style={{ fontSize:48 }}>🚧</div>
    <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontSize:22, fontWeight:700 }}>{name}</div>
    <div style={{ color:'var(--text3)', fontSize:14 }}>This screen is coming soon in the next build phase.</div>
  </div>
);

const HETableRow = ({ cells, highlight }) => (
  <tr style={{ borderBottom:'1px solid var(--border)',
    background: highlight ? 'rgba(245,158,11,0.05)' : 'transparent',
    transition:'background 150ms' }}
    onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
    onMouseLeave={e=>e.currentTarget.style.background= highlight ? 'rgba(245,158,11,0.05)' : 'transparent'}>
    {cells.map((c, i) => (
      <td key={i} style={{ padding:'10px 16px', fontSize:13, color:'var(--text1)',
        whiteSpace: i===0 ? 'nowrap' : undefined }}>
        {c}
      </td>
    ))}
  </tr>
);

Object.assign(window, {
  HEIcon, HEAvatar, HEBadge, HEStatCard, HEProgress, HEPillar, HETier,
  HEBarChart, HESectionLabel, HECard, HEBtn, HEComingSoon, HETableRow,
});
