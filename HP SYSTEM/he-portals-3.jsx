// HE-SYSTEM — Partner Portal + Parent Portal
const { useState } = React;

// ─── PARTNER PORTAL ──────────────────────────────────────────
const PartnerDashboard = ({ d, lang }) => {
  const nextTierNeeded = d.nextTierAt - d.recruited;
  const tierPct = Math.min(100, Math.round((d.recruited / d.nextTierAt) * 100));
  const nextEarning = (d.nextTierAt * 1000 * 0.35).toLocaleString();
  return (
    <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color:'var(--text3)', fontSize:13, marginBottom:4 }}>Partner Dashboard</div>
          <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:800, fontSize:30 }}>{d.name}</div>
          <div style={{ color:'var(--text2)', fontSize:13, marginTop:4 }}><span style={{fontFamily:'monospace',color:'var(--text3)'}}>{d.id}</span> · Referral Partner</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
          <HETier tier={d.tier} size="lg" />
          <div style={{ color:'var(--text3)', fontSize:12 }}>{d.rate}% commission rate</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <HEStatCard icon="commission" label="Total Earned" value={d.totalEarned} format="currency" accent="#F59E0B" trend={8.2} />
        <HEStatCard icon="finance" label="This Month" value={d.thisMonth} format="currency" accent="#16A34A" trend={12.4} />
        <HEStatCard icon="students" label="Students Recruited" value={d.recruited} accent="#1B3D8C" trend={5.3} />
        <HEStatCard icon="payouts" label="Pending Payout" value={d.pending} format="currency" accent="#DC2626" />
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:16, padding:'24px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(245,158,11,0.05)', pointerEvents:'none' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ color:'#FCD34D', fontWeight:700, fontSize:15 }}>🏆 Tier Progress to Platinum</div>
            <div style={{ color:'var(--text2)', fontSize:13, marginTop:4 }}>
              You need <strong style={{color:'var(--text1)'}}>{nextTierNeeded} more students</strong> to unlock Platinum (35% commission)
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>At Platinum</div>
            <div style={{ color:'#A78BFA', fontFamily:'Oswald', fontWeight:800, fontSize:22 }}>RM {nextEarning}/yr est.</div>
          </div>
        </div>
        <div style={{ marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ color:'var(--text3)', fontSize:12 }}>{d.recruited} students recruited</span>
            <span style={{ color:'#FCD34D', fontSize:12, fontWeight:600 }}>{tierPct}% to Platinum</span>
          </div>
          <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:9999, height:10, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${tierPct}%`, borderRadius:9999,
              background:'linear-gradient(90deg, #F59E0B, #A78BFA)',
              transition:'width 800ms cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text3)' }}>
          <span>Gold (31)</span><span>Platinum (61+)</span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20 }}>
        <div>
          <HESectionLabel>My Recruited Students</HESectionLabel>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--surface2)' }}>
                  {['Student','Programme','Status','Commission','Enrolled'].map(h=>(
                    <th key={h} style={{ padding:'10px 16px', color:'var(--text3)', fontSize:11, fontWeight:700, textAlign:'left', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.students.map((s, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)', transition:'background 150ms' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'11px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <HEAvatar name={s.name} size={28} />
                        <span style={{ color:'var(--text1)', fontSize:13, fontWeight:500 }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'11px 16px', color:'var(--text2)', fontSize:12 }}>{s.programme}</td>
                    <td style={{ padding:'11px 16px' }}><HEBadge variant={s.status}>{s.status.charAt(0).toUpperCase()+s.status.slice(1)}</HEBadge></td>
                    <td style={{ padding:'11px 16px', color: s.comm>0?'#FCD34D':'var(--text3)', fontFamily:'Oswald', fontWeight:700, fontSize:14 }}>
                      {s.comm>0 ? `RM ${s.comm.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding:'11px 16px', color:'var(--text3)', fontSize:12 }}>{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <HESectionLabel>Commission Formula</HESectionLabel>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px' }}>
              <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:13, color:'#93B4FF',
                background:'rgba(27,61,140,0.1)', borderRadius:8, padding:'12px', marginBottom:12, lineHeight:1.6 }}>
                Rate = min(35%, 8% + students × 0.4%)
              </div>
              {[
                { students:d.recruited, rate:d.rate, label:'You (current)' },
                { students:61, rate:35, label:'Platinum' },
              ].map((ex,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0',
                  borderBottom: i===0?'1px solid var(--border)':'none' }}>
                  <span style={{ color:'var(--text2)', fontSize:13 }}>{ex.students} students → {ex.rate}%</span>
                  <span style={{ color: i===0?'#FCD34D':'#A78BFA', fontWeight:700, fontSize:13 }}>{ex.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <HESectionLabel>Payout</HESectionLabel>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <div>
                  <div style={{ color:'var(--text3)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em' }}>Pending</div>
                  <div style={{ color:'#FCD34D', fontFamily:'Oswald', fontWeight:800, fontSize:22 }}>RM {d.pending.toLocaleString()}</div>
                </div>
                <HEBtn variant="gold" icon="payouts">Request Payout</HEBtn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PartnerLeaderboard = ({ d }) => (
  <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
    <div>
      <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:24 }}>Partner Leaderboard</div>
      <div style={{ color:'var(--text3)', fontSize:13, marginTop:4 }}>June 2026 ranking by students recruited</div>
    </div>
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
      {d.leaderboard.map((p, i) => (
        <div key={i} style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16,
          borderBottom: i<d.leaderboard.length-1?'1px solid var(--border)':'none',
          background: p.isMe?'rgba(245,158,11,0.06)':'transparent',
          border: p.isMe?'1px solid rgba(245,158,11,0.15)':undefined,
          transition:'background 150ms' }}
          onMouseEnter={e=>{ if(!p.isMe) e.currentTarget.style.background='var(--surface2)'; }}
          onMouseLeave={e=>{ if(!p.isMe) e.currentTarget.style.background='transparent'; }}>
          <div style={{ width:36, height:36, borderRadius:'50%',
            background: p.rank===1?'rgba(245,158,11,0.2)':p.rank===2?'rgba(192,192,192,0.15)':p.rank===3?'rgba(205,127,50,0.15)':'var(--surface2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color: p.rank===1?'#FCD34D':p.rank===2?'#C0C0C0':p.rank===3?'#CD7F32':'var(--text3)',
            fontSize:16, fontWeight:800, fontFamily:'Oswald', flexShrink:0 }}>
            {p.rank===1?'🥇':p.rank===2?'🥈':p.rank===3?'🥉':p.rank}
          </div>
          <HEAvatar name={p.name} size={38} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color: p.isMe?'#FCD34D':'var(--text1)', fontWeight: p.isMe?700:600, fontSize:14 }}>{p.name}</span>
              {p.isMe && <span style={{ color:'#FCD34D', fontSize:11, fontWeight:700 }}>← YOU</span>}
            </div>
            <div style={{ marginTop:4 }}><HETier tier={p.tier} /></div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:18 }}>{p.students} students</div>
            <div style={{ color:'#FCD34D', fontSize:13, marginTop:2 }}>RM {p.earned.toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const PartnerPortal = ({ screen, lang }) => {
  const d = window.HE_MOCK.partner;
  const screens = {
    dashboard: <PartnerDashboard d={d} lang={lang} />,
    leaderboard: <PartnerLeaderboard d={d} />,
    students: <PartnerStudentsPage d={d} />,
    commission: <PartnerCommissionPage d={d} />,
    payouts: <PartnerPayoutsPage d={d} />,
    profile: <HEComingSoon name="Profile & Banking" />,
  };
  return screens[screen] || screens.dashboard;
};

// ─── PARENT PORTAL ──────────────────────────────────────────
const ParentDashboard = ({ d, lang }) => {
  const [activeIdx, setActiveIdx] = useState(d.activeChild);
  const child = d.children[activeIdx];
  return (
    <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color:'var(--text3)', fontSize:13, marginBottom:4 }}>Parent Portal</div>
          <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:800, fontSize:30 }}>{d.name}</div>
          <div style={{ color:'var(--text2)', fontSize:13, marginTop:4 }}>Monitoring {d.children.length} {d.children.length===1?'child':'children'}</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <HEBtn icon="messages" variant="secondary">Message Teacher</HEBtn>
          <HEBtn icon="fees" variant="primary">Pay Fees</HEBtn>
        </div>
      </div>

      {d.children.length > 1 && (
        <div style={{ display:'flex', gap:10 }}>
          {d.children.map((c, i) => (
            <button key={i} onClick={()=>setActiveIdx(i)}
              style={{ padding:'10px 20px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                display:'flex', alignItems:'center', gap:10, transition:'all 150ms',
                background: activeIdx===i?'rgba(22,163,74,0.15)':'var(--surface)',
                border: activeIdx===i?'1px solid rgba(22,163,74,0.3)':'1px solid var(--border)',
                color: activeIdx===i?'#86EFAC':'var(--text2)' }}>
              <HEAvatar name={c.name} size={28} color={activeIdx===i?'#16A34A':undefined} />
              <div style={{ textAlign:'left' }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{c.name}</div>
                <div style={{ fontSize:11, opacity:0.7 }}>{c.programme}</div>
              </div>
              {c.attAlerts > 0 && (
                <div style={{ width:18, height:18, borderRadius:'50%', background:'#DC2626', color:'#fff',
                  fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {c.attAlerts}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <HEStatCard icon="attendance" label="Attendance Rate" value={child.att} format="percent" accent={child.att>=80?'#16A34A':child.att>=65?'#D97706':'#DC2626'} />
        <HEStatCard icon="grades" label="Current GPA" value={child.gpa} format="decimal" accent="#1B3D8C" />
        <HEStatCard icon="fees" label="Fee Balance" value={child.feeBal} format="currency" accent={child.feeBal>0?'#DC2626':'#16A34A'} />
        <HEStatCard icon="timetable" label="Semester" value={child.semester} accent="#F59E0B" />
      </div>

      {child.attAlerts > 0 && (
        <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.25)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
          <HEIcon name="exclamation" size={20} color="#FCA5A5" />
          <div>
            <div style={{ color:'#FCA5A5', fontWeight:700, fontSize:14 }}>Attendance Alert</div>
            <div style={{ color:'var(--text2)', fontSize:13, marginTop:2 }}>
              {child.name} has missed {child.attAlerts} classes this week. Current rate: {child.att}% (minimum 80% required)
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20 }}>
        <div>
          <HESectionLabel>Academic Performance — {child.name}</HESectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {child.grades.map((g, i) => (
              <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ color:'var(--text1)', fontWeight:600, fontSize:14 }}>{g.subject}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ color:'var(--text3)', fontSize:13 }}>{g.score}/100</div>
                    <div style={{ color: window.gradeColor(g.grade), fontFamily:'Oswald', fontWeight:800, fontSize:22 }}>{g.grade}</div>
                  </div>
                </div>
                <HEProgress value={g.score} color={window.gradeColor(g.grade)} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <HESectionLabel>Child Info</HESectionLabel>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
              <HEAvatar name={child.name} size={48} color="#16A34A" />
              <div>
                <div style={{ color:'var(--text1)', fontWeight:700, fontSize:16 }}>{child.name}</div>
                <div style={{ color:'var(--text3)', fontFamily:'monospace', fontSize:12, marginTop:3 }}>{child.id}</div>
              </div>
            </div>
            {[
              ['Programme', child.programme],
              ['Semester', `Semester ${child.semester}`],
              ['Attendance', `${child.att}%`],
              ['Fee Balance', child.feeBal>0 ? `RM ${child.feeBal.toLocaleString()}` : 'Fully Paid ✓'],
            ].map(([k,v])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ color:'var(--text3)', fontSize:13 }}>{k}</span>
                <span style={{ color: k==='Fee Balance'&&child.feeBal>0?'#FCA5A5':k==='Fee Balance'?'#86EFAC':'var(--text1)', fontSize:13, fontWeight:500 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:14 }}>
              <HEBtn variant="primary" style={{ width:'100%', justifyContent:'center' }} icon="messages">Message Teacher</HEBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ParentPortal = ({ screen, lang }) => {
  const d = window.HE_MOCK.parent;
  const screens = {
    dashboard: <ParentDashboard d={d} lang={lang} />,
    attendance: <ParentAttendancePage d={d} />,
    results: <ParentResultsPage d={d} />,
    fees: <ParentFeesPage d={d} />,
    messages: <ParentMessagesPage d={d} />,
  };
  return screens[screen] || screens.dashboard;
};

Object.assign(window, { PartnerPortal, ParentPortal });
