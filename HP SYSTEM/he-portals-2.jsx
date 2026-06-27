// HE-SYSTEM — Admin Portal + Management Portal
const { useState } = React;

// ─── ADMIN PORTAL ──────────────────────────────────────────
const AdminDashboard = ({ d, lang }) => {
  const t = window.HE_I18N[lang];
  return (
    <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color:'var(--text3)', fontSize:13, marginBottom:4 }}>Admin Portal</div>
          <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:800, fontSize:30 }}>{d.name}</div>
          <div style={{ color:'var(--text2)', fontSize:13, marginTop:4 }}>Operations & Student Management · <span style={{fontFamily:'monospace',color:'var(--text3)'}}>{d.id}</span></div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <HEBtn icon="enrolment" variant="primary">New Enrolment</HEBtn>
          <HEBtn icon="invoices" variant="secondary">Create Invoice</HEBtn>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <HEStatCard icon="students" label="Total Students" value={d.totalStudents} accent="#1B3D8C" trend={3.5} />
        <HEStatCard icon="enrolment" label="New This Month" value={d.newEnrolments} accent="#16A34A" trend={8.2} />
        <HEStatCard icon="invoices" label="Pending Invoices" value={d.pendingInvoices} accent="#DC2626" />
        <HEStatCard icon="reports" label="Pending Tasks" value={d.pendingTasks} accent="#F59E0B" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20 }}>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <HESectionLabel>Recent Enrolments</HESectionLabel>
            <HEBtn variant="ghost" small>View All →</HEBtn>
          </div>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--surface2)' }}>
                  {['Student','Programme','ID','Status','Date'].map(h=>(
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
                    <td style={{ padding:'11px 16px', color:'var(--text2)', fontSize:13 }}>{s.programme}</td>
                    <td style={{ padding:'11px 16px', color:'var(--text3)', fontFamily:'monospace', fontSize:11 }}>{s.id}</td>
                    <td style={{ padding:'11px 16px' }}><HEBadge variant={s.status}>{s.status.charAt(0).toUpperCase()+s.status.slice(1)}</HEBadge></td>
                    <td style={{ padding:'11px 16px', color:'var(--text3)', fontSize:12 }}>{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <HESectionLabel>Overdue Invoices</HESectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {d.invoices.map((inv, i) => (
              <div key={i} style={{ background: inv.overdue?'rgba(220,38,38,0.07)':'var(--surface)',
                border:`1px solid ${inv.overdue?'rgba(220,38,38,0.25)':'var(--border)'}`,
                borderRadius:10, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <HEAvatar name={inv.student} size={26} />
                    <div style={{ color:'var(--text1)', fontSize:13, fontWeight:500 }}>{inv.student}</div>
                  </div>
                  {inv.overdue && <HEBadge variant="red">OVERDUE</HEBadge>}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ color:'var(--text3)', fontFamily:'monospace', fontSize:11 }}>{inv.inv}</div>
                    <div style={{ color:'var(--text3)', fontSize:11, marginTop:2 }}>Due: {inv.due}</div>
                  </div>
                  <div style={{ color: inv.overdue?'#FCA5A5':'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:18 }}>
                    RM {inv.amount.toLocaleString()}
                  </div>
                </div>
                <div style={{ marginTop:10, display:'flex', gap:8 }}>
                  <HEBtn variant="primary" small>Send Reminder</HEBtn>
                  <HEBtn variant="ghost" small>View</HEBtn>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminStudents = ({ d }) => {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? d.students : d.students.filter(s => s.status === filter);
  return (
    <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:24 }}>Student Directory</div>
          <div style={{ color:'var(--text3)', fontSize:13, marginTop:4 }}>{d.totalStudents.toLocaleString()} total enrolled students</div>
        </div>
        <HEBtn icon="enrolment" variant="primary">+ New Student</HEBtn>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        {['all','active','pending','inactive'].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:'6px 16px', borderRadius:8, cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, transition:'all 150ms',
              background: filter===f ? '#1B3D8C' : 'var(--surface)',
              color: filter===f ? '#fff' : 'var(--text2)',
              border: filter===f ? 'transparent' : '1px solid var(--border)' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'var(--surface2)' }}>
              {['Student','Programme','Student ID','Status','Enrolled','Actions'].map(h=>(
                <th key={h} style={{ padding:'10px 16px', color:'var(--text3)', fontSize:11, fontWeight:700, textAlign:'left', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={i} style={{ borderBottom:'1px solid var(--border)', transition:'background 150ms' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'11px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <HEAvatar name={s.name} size={32} />
                    <span style={{ color:'var(--text1)', fontSize:13, fontWeight:600 }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ padding:'11px 16px', color:'var(--text2)', fontSize:13 }}>{s.programme}</td>
                <td style={{ padding:'11px 16px', color:'var(--text3)', fontFamily:'monospace', fontSize:12 }}>{s.id}</td>
                <td style={{ padding:'11px 16px' }}><HEBadge variant={s.status}>{s.status.charAt(0).toUpperCase()+s.status.slice(1)}</HEBadge></td>
                <td style={{ padding:'11px 16px', color:'var(--text3)', fontSize:12 }}>{s.date}</td>
                <td style={{ padding:'11px 16px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <HEBtn variant="secondary" small icon="eye">View</HEBtn>
                    <HEBtn variant="ghost" small icon="settings">Edit</HEBtn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminPortal = ({ screen, lang }) => {
  const d = window.HE_MOCK.admin;
  const screens = {
    dashboard: <AdminDashboard d={d} lang={lang} />,
    students: <AdminStudents d={d} />,
    enrolment: <AdminEnrolmentForm />,
    invoices: <AdminInvoicesPage d={d} />,
    partners: <AdminPartnersPage />,
    staff: <AdminStaffPage />,
    timetable: <HEComingSoon name="Timetable Builder" />,
    reports: <AdminReportsPage />,
  };
  return screens[screen] || screens.dashboard;
};

// ─── MANAGEMENT PORTAL ──────────────────────────────────────
const ManagementDashboard = ({ d, lang }) => {
  const revPct = Math.round((d.revenue / d.revenueTarget) * 100);
  const stuPct = Math.round((d.students / d.studentTarget) * 100);
  return (
    <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color:'var(--text3)', fontSize:13, marginBottom:4 }}>Executive Dashboard</div>
          <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:800, fontSize:30 }}>{d.name}</div>
          <div style={{ color:'var(--text2)', fontSize:13, marginTop:4 }}>Happy English — June 2026 Overview</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <HEBtn icon="download" variant="secondary">Export Report</HEBtn>
          <HEBtn icon="reports" variant="primary">Full Analytics</HEBtn>
        </div>
      </div>
      {d.alerts.map((a, i) => (
        <div key={i} style={{ background: a.type==='danger'?'rgba(220,38,38,0.08)':a.type==='warning'?'rgba(245,158,11,0.08)':'rgba(14,165,233,0.08)',
          border:`1px solid ${a.type==='danger'?'rgba(220,38,38,0.25)':a.type==='warning'?'rgba(245,158,11,0.25)':'rgba(14,165,233,0.25)'}`,
          borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <HEIcon name={a.type==='info'?'info':'exclamation'} size={16}
            color={a.type==='danger'?'#FCA5A5':a.type==='warning'?'#FCD34D':'#7DD3FC'} />
          <span style={{ color:'var(--text2)', fontSize:13 }}>{a.msg}</span>
        </div>
      ))}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <HEStatCard icon="finance" label="Total Revenue" value={d.revenue} format="currency" accent="#1B3D8C" trend={5.4} />
        <HEStatCard icon="students" label="Total Students" value={d.students} accent="#16A34A" trend={3.5} />
        <HEStatCard icon="fees" label="Outstanding Fees" value={d.outstanding} format="currency" accent="#DC2626" />
        <HEStatCard icon="partners" label="Commission Paid" value={d.commission} format="currency" accent="#F59E0B" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20 }}>
        <div>
          <HESectionLabel>Monthly Revenue — 2026</HESectionLabel>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 20px 12px' }}>
            <HEBarChart data={d.chart} labels={d.chartLabels} color="#1B3D8C" height={120} />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Revenue YTD</div>
                <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:18, marginTop:4 }}>RM {(d.revenue/1000).toFixed(0)}K</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Target</div>
                <div style={{ color:'var(--text2)', fontFamily:'Oswald', fontWeight:700, fontSize:18, marginTop:4 }}>RM {(d.revenueTarget/1000).toFixed(0)}K</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>Progress</div>
                <div style={{ color: revPct>=90?'#86EFAC':revPct>=70?'#FCD34D':'#FCA5A5', fontFamily:'Oswald', fontWeight:700, fontSize:18, marginTop:4 }}>{revPct}%</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <HESectionLabel>Enrolment vs Target</HESectionLabel>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:22 }}>{d.students.toLocaleString()}</div>
                  <div style={{ color:'var(--text3)', fontSize:11 }}>of {d.studentTarget.toLocaleString()} target</div>
                </div>
                <div style={{ color: stuPct>=90?'#86EFAC':stuPct>=70?'#FCD34D':'#FCA5A5', fontFamily:'Oswald', fontWeight:700, fontSize:22 }}>{stuPct}%</div>
              </div>
              <HEProgress value={stuPct} color={stuPct>=90?'#16A34A':stuPct>=70?'#D97706':'#DC2626'} height={8} />
            </div>
          </div>
          <div>
            <HESectionLabel>KPI Summary — Teachers</HESectionLabel>
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:22 }}>{d.avgKpi}</div>
                  <div style={{ color:'var(--text3)', fontSize:11 }}>avg KPI · {d.teachers} teachers</div>
                </div>
                <div style={{ color: window.gradeColor(d.avgKpi>=80?'A':d.avgKpi>=70?'B':'C'), fontFamily:'Oswald', fontWeight:700, fontSize:22 }}>
                  {d.avgKpi>=80?'A':d.avgKpi>=70?'B':d.avgKpi>=60?'C':'D'}
                </div>
              </div>
              <HEProgress value={d.avgKpi} color="#1B3D8C" height={8} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div>
          <HESectionLabel>Top Teachers by KPI</HESectionLabel>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            {d.topTeachers.map((t, i) => (
              <div key={i} style={{ padding:'12px 16px', borderBottom: i<d.topTeachers.length-1?'1px solid var(--border)':'none',
                display:'flex', alignItems:'center', gap:14, transition:'background 150ms' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: i===0?'#FCD34D':i===1?'#94A3B8':i===2?'#CD7F32':'var(--text3)',
                  fontSize:13, fontWeight:800, fontFamily:'Oswald', flexShrink:0 }}>
                  {i+1}
                </div>
                <HEAvatar name={t.name} size={32} />
                <div style={{ flex:1 }}>
                  <div style={{ color:'var(--text1)', fontWeight:600, fontSize:13 }}>{t.name}</div>
                  <div style={{ marginTop:4 }}><HEProgress value={t.kpi} color={window.gradeColor(t.grade)} height={4} /></div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ color: window.gradeColor(t.grade), fontFamily:'Oswald', fontWeight:800, fontSize:18 }}>{t.grade}</div>
                  <div style={{ color:'var(--text3)', fontSize:11 }}>{t.kpi}</div>
                </div>
                <div>
                  {t.trend==='up' && <span style={{ color:'#86EFAC', fontSize:14 }}>↑</span>}
                  {t.trend==='down' && <span style={{ color:'#FCA5A5', fontSize:14 }}>↓</span>}
                  {t.trend==='neutral' && <span style={{ color:'var(--text3)', fontSize:14 }}>→</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <HESectionLabel>Quick Actions</HESectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { icon:'analytics', label:'KPI Overview', color:'#1B3D8C', sub:'All 42 teachers' },
              { icon:'finance', label:'Finance Report', color:'#16A34A', sub:'June 2026' },
              { icon:'partners', label:'Partner Report', color:'#D97706', sub:'Commission summary' },
              { icon:'students', label:'At-Risk Students', color:'#DC2626', sub:'18 flagged' },
            ].map((a,i)=>(
              <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px', cursor:'pointer', transition:'all 200ms' }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor=a.color+'40'; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.borderColor='var(--border)'; }}>
                <div style={{ width:36, height:36, borderRadius:8, background:a.color+'18', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10, color:a.color==='#1B3D8C'?'#93B4FF':a.color }}>
                  <HEIcon name={a.icon} size={18} />
                </div>
                <div style={{ color:'var(--text1)', fontWeight:600, fontSize:13 }}>{a.label}</div>
                <div style={{ color:'var(--text3)', fontSize:11, marginTop:3 }}>{a.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ManagementPortal = ({ screen, lang }) => {
  const d = window.HE_MOCK.management;
  const screens = {
    dashboard: <ManagementDashboard d={d} lang={lang} />,
    kpi: <MgmtKPIAll d={d} />,
    finance: <MgmtFinancePage d={d} />,
    enrolment: <MgmtAnalyticsPage d={d} />,
    partners: <MgmtPartnerReport d={d} />,
    reports: <AdminReportsPage />,
  };
  return screens[screen] || screens.dashboard;
};

Object.assign(window, { AdminPortal, ManagementPortal });
