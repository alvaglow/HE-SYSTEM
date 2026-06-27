// HE-SYSTEM — App Shell: Login, Sidebar, TopBar, Mobile Frame, Root
const { useState, useEffect, useRef } = React;

// ─── LOGIN / ROLE SELECTOR ───────────────────────────────────
const HELogin = ({ onLogin, lang, setLang, theme, setTheme }) => {
  const t = window.HE_I18N[lang];
  const [hov, setHov] = useState(null);
  const roles = ['student','teacher','admin','management','partner','parent'];
  const emojis = { student:'🎓', teacher:'👩‍🏫', admin:'⚙️', management:'📊', partner:'🤝', parent:'👨‍👩‍👧' };
  const colors = { student:'#1B3D8C', teacher:'#2E5FCC', admin:'#475569', management:'#7C3AED', partner:'#D97706', parent:'#16A34A' };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:'40px 24px', position:'relative', overflow:'hidden' }}>
      {/* Ambient glows */}
      <div style={{ position:'absolute', top:-200, left:-150, width:600, height:600, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(27,61,140,0.18) 0%, transparent 65%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-100, right:-100, width:450, height:450, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'40%', right:'10%', width:300, height:300, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 65%)', pointerEvents:'none' }} />

      {/* Top controls */}
      <div style={{ position:'absolute', top:20, right:24, display:'flex', gap:8 }}>
        <button onClick={()=>setLang(lang==='en'?'vi':'en')}
          style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px',
            color:'var(--text2)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 150ms' }}>
          {lang==='en'?'🇻🇳 VI':'🇬🇧 EN'}
        </button>
        <button onClick={()=>setTheme(theme==='dark'?'light':'dark')}
          style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px',
            color:'var(--text2)', fontSize:14, cursor:'pointer', transition:'all 150ms' }}>
          {theme==='dark'?'☀️':'🌙'}
        </button>
      </div>

      {/* Logo */}
      <div style={{ marginBottom:52, textAlign:'center', animation:'fadeSlideDown 0.7s ease both' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:18, marginBottom:16 }}>
          <div style={{ width:76, height:76, borderRadius:18, background:'#1B3D8C', position:'relative',
            overflow:'hidden', boxShadow:'0 12px 40px rgba(27,61,140,0.45), 0 0 0 1px rgba(255,255,255,0.06)' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:7, background:'#F59E0B' }} />
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:20, background:'#DC2626' }} />
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', paddingTop:4 }}>
              <span style={{ fontFamily:'Oswald, sans-serif', fontWeight:700, fontSize:30, color:'#fff', letterSpacing:'-0.02em' }}>HE</span>
            </div>
          </div>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontFamily:'Oswald, sans-serif', fontWeight:800, fontSize:36, color:'var(--text1)',
              letterSpacing:'-0.02em', lineHeight:1 }}>
              HE<span style={{ color:'#DC2626' }}>-SYSTEM</span>
            </div>
            <div style={{ color:'var(--text3)', fontSize:14, marginTop:5 }}>{t.tagline}</div>
          </div>
        </div>
        <div style={{ color:'var(--text2)', fontSize:15 }}>{t.choosePortal}</div>
      </div>

      {/* Portal Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, maxWidth:880, width:'100%' }}>
        {roles.map((role, i) => {
          const col = colors[role];
          const isHov = hov === role;
          return (
            <div key={role} onClick={()=>onLogin(role)}
              onMouseEnter={()=>setHov(role)} onMouseLeave={()=>setHov(null)}
              style={{ background: isHov ? col+'16' : 'var(--surface)',
                border:`1px solid ${isHov ? col+'45' : 'var(--border)'}`,
                borderRadius:16, padding:'24px 22px', cursor:'pointer',
                transform: isHov ? 'translateY(-5px)' : 'translateY(0)',
                boxShadow: isHov ? `0 16px 40px ${col}28` : 'none',
                transition:'all 220ms cubic-bezier(0.4,0,0.2,1)',
                animation:`fadeSlideUp 0.55s ease ${0.08*i + 0.15}s both`,
                position:'relative', overflow:'hidden' }}>
              {isHov && <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:col }} />}
              <div style={{ fontSize:34, marginBottom:14, lineHeight:1 }}>{emojis[role]}</div>
              <div style={{ color:'var(--text1)', fontFamily:'Oswald, sans-serif', fontWeight:700, fontSize:18, marginBottom:6 }}>
                {t.portals[role]}
              </div>
              <div style={{ color:'var(--text2)', fontSize:13, lineHeight:1.55 }}>{t.desc[role]}</div>
              <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:6,
                color: isHov ? col : 'var(--text3)', fontSize:13, fontWeight:600, transition:'color 200ms' }}>
                {lang==='vi'?'Truy cập →':'Enter Portal →'}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:40, color:'var(--text3)', fontSize:12 }}>
        HE-SYSTEM v1.0 · Happy English Learning Platform · June 2026
      </div>
    </div>
  );
};

// ─── SIDEBAR ────────────────────────────────────────────────
const HESidebar = ({ role, screen, setScreen, lang, onLogout, collapsed }) => {
  const t = window.HE_I18N[lang];
  const pc = window.HE_PORTALS[role];
  const d = window.HE_MOCK[role];
  const roleColors = { student:'#1B3D8C', teacher:'#1B3D8C', admin:'#475569', management:'#7C3AED', partner:'#D97706', parent:'#16A34A' };
  const col = roleColors[role] || '#1B3D8C';
  const navItems = pc.nav;

  return (
    <div style={{ width: collapsed ? 60 : 228, height:'100%', background:'var(--sidebar-bg)',
      display:'flex', flexDirection:'column', borderRight:'1px solid var(--border)',
      transition:'width 250ms cubic-bezier(0.4,0,0.2,1)', overflow:'hidden', flexShrink:0 }}>
      {/* Logo */}
      <div style={{ padding: collapsed?'18px 0':'18px 20px', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent: collapsed?'center':'flex-start', gap:10, flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'#1B3D8C', position:'relative',
          overflow:'hidden', flexShrink:0, boxShadow:'0 4px 12px rgba(27,61,140,0.35)' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'#F59E0B' }} />
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:10, background:'#DC2626' }} />
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', paddingTop:2 }}>
            <span style={{ fontFamily:'Oswald', fontWeight:700, fontSize:14, color:'#fff' }}>HE</span>
          </div>
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontFamily:'Oswald', fontWeight:700, fontSize:15, color:'var(--text1)', lineHeight:1 }}>
              HE<span style={{ color:'#DC2626' }}>-SYSTEM</span>
            </div>
            <div style={{ color:'var(--text3)', fontSize:10, marginTop:2 }}>{t.portals[role]}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'10px 8px', overflowY:'auto', overflowX:'hidden' }}>
        {navItems.map(item => {
          const active = screen === item;
          return (
            <button key={item} onClick={()=>setScreen(item)}
              title={collapsed ? (t.nav[item]||item) : undefined}
              style={{ width:'100%', display:'flex', alignItems:'center',
                gap: collapsed ? 0 : 10, padding: collapsed ? '10px' : '9px 12px',
                borderRadius:8, cursor:'pointer', border:'none', fontFamily:'inherit',
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom:2,
                background: active ? col+'22' : 'transparent',
                color: active ? (col==='#475569'?'#94A3B8':col==='#1B3D8C'?'#93B4FF':col==='#7C3AED'?'#C4B5FD':col==='#D97706'?'#FCD34D':'#86EFAC') : 'var(--text2)',
                transition:'all 150ms' }}
              onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background='var(--surface2)'; e.currentTarget.style.color='var(--text1)'; }}}
              onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)'; }}}>
              <HEIcon name={item} size={17} />
              {!collapsed && <span style={{ fontSize:13, fontWeight: active?600:400, whiteSpace:'nowrap' }}>{t.nav[item]||item}</span>}
              {!collapsed && active && <div style={{ marginLeft:'auto', width:4, height:4, borderRadius:'50%', background:'currentColor' }} />}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: collapsed?'12px 8px':'12px 12px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap: collapsed?0:10, justifyContent: collapsed?'center':'flex-start' }}>
          <HEAvatar name={d.name} size={34} />
          {!collapsed && (
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:'var(--text1)', fontWeight:600, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</div>
              <div style={{ color:'var(--text3)', fontSize:10, marginTop:1, fontFamily:'monospace' }}>{d.id}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={onLogout}
            style={{ width:'100%', marginTop:10, display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
              borderRadius:7, cursor:'pointer', border:'1px solid var(--border)', background:'transparent',
              color:'var(--text3)', fontSize:12, fontFamily:'inherit', transition:'all 150ms' }}
            onMouseEnter={e=>{ e.currentTarget.style.color='#FCA5A5'; e.currentTarget.style.borderColor='rgba(220,38,38,0.3)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.color='var(--text3)'; e.currentTarget.style.borderColor='var(--border)'; }}>
            <HEIcon name="logout" size={14} />
            <span>{t.nav.logout}</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ─── TOP BAR ────────────────────────────────────────────────
const HETopBar = ({ role, screen, lang, setLang, theme, setTheme, showMobile, setShowMobile, collapsed, setCollapsed, onRoleSwitch, onNotif, onCalendar, notifCount }) => {
  const t = window.HE_I18N[lang];
  const d = window.HE_MOCK[role];
  const roleName = t.portals[role];
  const screenLabel = t.nav[screen] || screen;

  return (
    <div style={{ height:54, background:'var(--topbar-bg)', borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', padding:'0 20px', gap:12, flexShrink:0 }}>
      <button onClick={()=>setCollapsed(c=>!c)}
        style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--text3)', padding:6, borderRadius:6, display:'flex', alignItems:'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
        <span style={{ color:'var(--text3)', fontSize:13 }}>{roleName}</span>
        <span style={{ color:'var(--text3)', fontSize:13 }}>/</span>
        <span style={{ color:'var(--text1)', fontSize:13, fontWeight:600 }}>{screenLabel}</span>
      </div>
      <div style={{ display:'flex', align:'center', gap:6 }}>
        <button onClick={()=>setShowMobile(s=>!s)} title="Toggle mobile preview"
          style={{ background: showMobile?'rgba(27,61,140,0.2)':'transparent',
            border: showMobile?'1px solid rgba(27,61,140,0.35)':'1px solid transparent',
            borderRadius:7, padding:'5px 10px', cursor:'pointer', color: showMobile?'#93B4FF':'var(--text3)',
            fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5, fontFamily:'inherit', transition:'all 150ms' }}>
          <HEIcon name="mobile" size={14} />
          {showMobile?'Mobile ✓':'Mobile'}
        </button>
        <button onClick={()=>setLang(lang==='en'?'vi':'en')}
          style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:7, padding:'5px 10px',
            color:'var(--text2)', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 150ms' }}>
          {lang==='en'?'🇻🇳 VI':'🇬🇧 EN'}
        </button>
        <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}
          style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:7, padding:'5px 8px',
            color:'var(--text2)', cursor:'pointer', fontSize:13, transition:'all 150ms' }}>
          {theme==='dark'?'☀️':'🌙'}
        </button>
        <button onClick={onCalendar} title="Academic Calendar"
          style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:7, padding:'5px 8px',
            color:'var(--text2)', cursor:'pointer', transition:'all 150ms', display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, fontFamily:'inherit' }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(27,61,140,0.4)'; e.currentTarget.style.color='#93B4FF'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}>
          <HEIcon name="timetable" size={14} />
          <span>Calendar</span>
        </button>
        <div style={{ position:'relative' }}>
          <button onClick={onNotif} style={{ background:'transparent', border:'1px solid var(--border)', borderRadius:7, padding:'5px 8px',
            color:'var(--text2)', cursor:'pointer', transition:'all 150ms', display:'flex', alignItems:'center' }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(27,61,140,0.4)'; e.currentTarget.style.color='#93B4FF'; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}>
            <HEIcon name="bell" size={16} />
          </button>
          {notifCount > 0 && (
            <div style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%',
              background:'#DC2626', color:'#fff', fontSize:9, fontWeight:700, display:'flex',
              alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>{notifCount}</div>
          )}
        </div>
        <button onClick={onRoleSwitch}
          style={{ display:'flex', alignItems:'center', gap:8, background:'transparent',
            border:'1px solid var(--border)', borderRadius:7, padding:'5px 10px', cursor:'pointer',
            color:'var(--text2)', fontSize:12, fontFamily:'inherit', transition:'all 150ms' }}
          onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(27,61,140,0.4)'; e.currentTarget.style.color='#93B4FF'; }}
          onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}>
          <HEAvatar name={d.name} size={22} />
          <span>Switch Role</span>
        </button>
      </div>
    </div>
  );
};

// ─── MOBILE FRAME ───────────────────────────────────────────
const HEMobileFrame = ({ role, screen, lang }) => {
  const t = window.HE_I18N[lang];
  const d = window.HE_MOCK[role];
  const pc = window.HE_PORTALS[role];
  const roleColors = { student:'#1B3D8C', teacher:'#1B3D8C', admin:'#475569', management:'#7C3AED', partner:'#D97706', parent:'#16A34A' };
  const col = roleColors[role] || '#1B3D8C';
  const tabIcons = pc.nav.slice(0,5);

  const MobileContent = () => {
    const md = window.HE_MOCK[role];
    if (role==='student') {
      return (
        <div style={{ padding:'16px 14px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <div style={{ color:'var(--text3)', fontSize:11 }}>Good morning ☀️</div>
            <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:800, fontSize:20 }}>{md.name.split(' ').slice(-1)[0]}</div>
            <div style={{ color:'var(--text3)', fontSize:11 }}>{md.programme}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { label:'Attendance', value:md.attendance+'%', color:'#1B3D8C', icon:'attendance' },
              { label:'GPA', value:md.gpa, color:'#16A34A', icon:'grades' },
              { label:'Fee Due', value:'RM '+md.feeBalance.toLocaleString(), color:'#DC2626', icon:'fees' },
              { label:'Classes Today', value:md.upcomingClasses, color:'#F59E0B', icon:'timetable' },
            ].map(s=>(
              <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)',
                borderRadius:10, padding:'10px 11px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:s.color, borderRadius:'10px 0 0 10px' }} />
                <div style={{ color:'var(--text3)', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</div>
                <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:800, fontSize:18, marginTop:2 }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ color:'var(--text3)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Today's Classes</div>
            {md.timetable.map((cls, i) => (
              <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
                padding:'9px 11px', marginBottom:6, display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ background:'rgba(27,61,140,0.12)', borderRadius:6, padding:'5px 8px', flexShrink:0 }}>
                  <div style={{ color:'#93B4FF', fontSize:11, fontWeight:700, fontFamily:'Oswald' }}>{cls.time.split('–')[0]}</div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'var(--text1)', fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cls.subject}</div>
                  <div style={{ color:'var(--text3)', fontSize:10 }}>{cls.room}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (role==='teacher') {
      return (
        <div style={{ padding:'16px 14px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <div style={{ color:'var(--text3)', fontSize:11 }}>Teacher Dashboard</div>
            <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:800, fontSize:18 }}>{md.name}</div>
          </div>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px', textAlign:'center' }}>
            <div style={{ color:'var(--text3)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>KPI Score</div>
            <div style={{ color: window.gradeColor(md.grade), fontFamily:'Oswald', fontWeight:800, fontSize:36 }}>{md.kpi}</div>
            <div style={{ color: window.gradeColor(md.grade), fontSize:13, fontWeight:700 }}>Grade {md.grade}</div>
          </div>
          {md.pillars.map(p=>(
            <div key={p.name} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <div style={{ color:'var(--text2)', fontSize:11, fontWeight:600 }}>{p.name}</div>
                <div style={{ color: window.gradeColor(p.grade), fontFamily:'Oswald', fontWeight:700, fontSize:15 }}>{p.grade}</div>
              </div>
              <HEProgress value={p.score} color={p.color} height={4} />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div style={{ padding:'16px 14px', display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div style={{ color:'var(--text3)', fontSize:11 }}>{t.portals[role]}</div>
          <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:800, fontSize:20 }}>{md.name}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            role==='management' && { label:'Revenue YTD', value:'RM '+Math.round(md.revenue/1000)+'K', color:'#1B3D8C' },
            role==='management' && { label:'Students', value:md.students, color:'#16A34A' },
            role==='management' && { label:'Avg KPI', value:md.avgKpi+'%', color:'#F59E0B' },
            role==='admin' && { label:'Total Students', value:md.totalStudents, color:'#1B3D8C' },
            role==='admin' && { label:'New This Month', value:md.newEnrolments, color:'#16A34A' },
            role==='admin' && { label:'Pending Invoices', value:md.pendingInvoices, color:'#DC2626' },
            role==='partner' && { label:'Total Earned', value:'RM '+md.totalEarned.toLocaleString(), color:'#F59E0B' },
            role==='partner' && { label:'Tier', value:md.tier.charAt(0).toUpperCase()+md.tier.slice(1), color:'#F59E0B' },
            role==='partner' && { label:'Students', value:md.recruited, color:'#1B3D8C' },
            role==='parent' && { label:'Attendance', value:md.children[0].att+'%', color:'#16A34A' },
            role==='parent' && { label:'GPA', value:md.children[0].gpa, color:'#1B3D8C' },
            role==='parent' && { label:'Fee Balance', value:'RM '+md.children[0].feeBal, color:md.children[0].feeBal>0?'#DC2626':'#16A34A' },
          ].filter(Boolean).map(s=>(
            <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'var(--text2)', fontSize:13 }}>{s.label}</span>
              <span style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:16 }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 16px', gap:12, flexShrink:0 }}>
      <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
        Mobile Preview
      </div>
      <div style={{ width:280, height:580, background:'#080E1F', borderRadius:36, border:'8px solid #1a2035',
        boxShadow:'0 0 0 1px #252d45, 0 24px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.04)',
        display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
        {/* Notch */}
        <div style={{ height:28, background:'var(--sidebar-bg)', display:'flex', alignItems:'center',
          justifyContent:'space-between', padding:'0 16px', flexShrink:0 }}>
          <span style={{ color:'var(--text3)', fontSize:9, fontWeight:700 }}>9:41</span>
          <div style={{ width:60, height:14, background:'#080E1F', borderRadius:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:40, height:6, background:'#1a2035', borderRadius:9999 }} />
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <div style={{ display:'flex', gap:1 }}>
              {[3,4,4,3].map((h,i)=><div key={i} style={{ width:2, height:h+3, background:'var(--text3)', borderRadius:1 }} />)}
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01M3.778 11.029a9 9 0 0116.444 0M6.222 13.558A6 6 0 0117.778 13.558"/></svg>
          </div>
        </div>
        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', background:'var(--bg)' }}>
          <MobileContent />
        </div>
        {/* Bottom Tab Bar */}
        <div style={{ height:56, background:'var(--sidebar-bg)', borderTop:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-around', padding:'0 4px', flexShrink:0 }}>
          {tabIcons.map((item, i) => {
            const isActive = item === screen || (i===0 && screen==='dashboard');
            return (
              <div key={item} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'6px 8px',
                color: isActive ? (col==='#1B3D8C'?'#93B4FF':col==='#D97706'?'#FCD34D':col==='#16A34A'?'#86EFAC':'var(--text1)') : 'var(--text3)',
                transition:'color 150ms' }}>
                <HEIcon name={item} size={18} />
                <span style={{ fontSize:8, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:40, textTransform:'capitalize' }}>{item}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── APP SHELL ──────────────────────────────────────────────
const HEAppShell = ({ role, onLogout, lang, setLang, theme, setTheme }) => {
  const pc = window.HE_PORTALS[role];
  const [screen, setScreen] = useState(pc.nav[0]);
  const [showMobile, setShowMobile] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const contentRef = useRef(null);
  const notifData = (window.NOTIF_DATA || {})[role] || [];
  const notifCount = notifData.filter(n => !n.read).length;

  useEffect(() => { setScreen(pc.nav[0]); }, [role]);
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [screen]);

  const renderPortal = () => {
    if (role==='student')    return <StudentPortal    screen={screen} setScreen={setScreen} lang={lang} />;
    if (role==='teacher')    return <TeacherPortal    screen={screen} lang={lang} />;
    if (role==='admin')      return <AdminPortal      screen={screen} lang={lang} />;
    if (role==='management') return <ManagementPortal screen={screen} lang={lang} />;
    if (role==='partner')    return <PartnerPortal    screen={screen} lang={lang} />;
    if (role==='parent')     return <ParentPortal     screen={screen} lang={lang} />;
    return null;
  };

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg)', overflow:'hidden', position:'relative' }}>
      {showNotif && <HENotifPanel role={role} onClose={()=>setShowNotif(false)} />}
      {showCalendar && <HECalendar role={role} onClose={()=>setShowCalendar(false)} />}
      <HESidebar role={role} screen={screen} setScreen={setScreen} lang={lang}
        onLogout={onLogout} collapsed={collapsed} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <HETopBar role={role} screen={screen} lang={lang} setLang={setLang}
          theme={theme} setTheme={setTheme} showMobile={showMobile}
          setShowMobile={setShowMobile} collapsed={collapsed}
          setCollapsed={setCollapsed} onRoleSwitch={onLogout}
          onNotif={()=>setShowNotif(s=>!s)} onCalendar={()=>setShowCalendar(s=>!s)}
          notifCount={notifCount} />
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          <div ref={contentRef} style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
            {renderPortal()}
          </div>
          {showMobile && (
            <div style={{ borderLeft:'1px solid var(--border)', background:'var(--bg)', overflowY:'auto', flexShrink:0 }}>
              <HEMobileFrame role={role} screen={screen} lang={lang} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ROOT APP ───────────────────────────────────────────────
const HEApp = () => {
  const saved = (() => { try { return JSON.parse(localStorage.getItem('he_state')||'{}'); } catch(e){ return {}; }})();
  const [role, setRole] = useState(saved.role || null);
  const [theme, setTheme] = useState(saved.theme || 'dark');
  const [lang, setLang] = useState(saved.lang || 'en');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('he_state', JSON.stringify({ role, theme, lang }));
  }, [role, theme, lang]);

  const handleLogin = (r) => setRole(r);
  const handleLogout = () => setRole(null);

  if (!role) {
    return <HELogin onLogin={handleLogin} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />;
  }
  return <HEAppShell role={role} onLogout={handleLogout} lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />;
};

ReactDOM.createRoot(document.getElementById('root')).render(<HEApp />);
