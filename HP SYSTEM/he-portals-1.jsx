// HE-SYSTEM — Student Portal + Teacher Portal
const { useState, useEffect, useRef } = React;

// ─── STUDENT PORTAL ──────────────────────────────────────────
const StudentDashboard = ({ d, lang }) => {
  const t = window.HE_I18N[lang];
  const hr = new Date().getHours();
  const greet = hr < 12 ? (lang==='vi'?'Chào buổi sáng':'Good morning') : hr < 17 ? (lang==='vi'?'Chào buổi chiều':'Good afternoon') : (lang==='vi'?'Chào buổi tối':'Good evening');
  return (
    <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24, minHeight:'100%' }}>
      <div>
        <div style={{ color:'var(--text3)', fontSize:13, marginBottom:4 }}>{greet} ☀️</div>
        <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:800, fontSize:30, lineHeight:1.1 }}>{d.name}</div>
        <div style={{ color:'var(--text2)', fontSize:13, marginTop:5 }}>{d.programme} · {lang==='vi'?'Kỳ':'Semester'} {d.semester} · <span style={{color:'var(--text3)', fontFamily:'monospace'}}>{d.id}</span></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <HEStatCard icon="attendance" label={lang==='vi'?'Điểm danh':'Attendance'} value={d.attendance} format="percent" accent="#1B3D8C" trend={2.1} />
        <HEStatCard icon="grades" label="GPA" value={d.gpa} format="decimal" accent="#16A34A" trend={0.08} />
        <HEStatCard icon="fees" label={lang==='vi'?'Học phí nợ':'Fee Balance'} value={d.feeBalance} format="currency" accent="#DC2626" />
        <HEStatCard icon="timetable" label={lang==='vi'?'Lớp hôm nay':'Classes Today'} value={d.upcomingClasses} accent="#F59E0B" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:20 }}>
        <div>
          <HESectionLabel>Today's Timetable</HESectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {d.timetable.map((cls, i) => (
              <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
                padding:'12px 16px', display:'flex', alignItems:'center', gap:12,
                transition:'transform 150ms'}}
                onMouseEnter={e=>e.currentTarget.style.transform='translateX(3px)'}
                onMouseLeave={e=>e.currentTarget.style.transform=''}>
                <div style={{ background: cls.type==='remote'?'rgba(14,165,233,0.12)':'rgba(27,61,140,0.12)',
                  borderRadius:8, padding:'8px 12px', minWidth:60, textAlign:'center', flexShrink:0 }}>
                  <div style={{ color: cls.type==='remote'?'#7DD3FC':'#93B4FF', fontFamily:'Oswald', fontWeight:700, fontSize:14 }}>
                    {cls.time.split('–')[0]}
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'var(--text1)', fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cls.subject}</div>
                  <div style={{ color:'var(--text3)', fontSize:12, marginTop:2 }}>{cls.teacher} · {cls.room}</div>
                </div>
                <HEBadge variant={cls.type}>{cls.type==='remote'?'💻 Online':'🏫 Campus'}</HEBadge>
              </div>
            ))}
          </div>
        </div>
        <div>
          <HESectionLabel>Fee Status</HESectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {d.fees.map((f, i) => (
              <div key={i} style={{ background: f.status==='overdue'?'rgba(220,38,38,0.07)':'var(--surface)',
                border:`1px solid ${f.status==='overdue'?'rgba(220,38,38,0.25)':'var(--border)'}`,
                borderRadius:10, padding:'12px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <HEBadge variant={f.status}>{f.status.charAt(0).toUpperCase()+f.status.slice(1)}</HEBadge>
                  <span style={{ color: f.status==='overdue'?'#FCA5A5':'var(--text1)', fontWeight:700, fontSize:14, fontFamily:'Oswald' }}>
                    RM {f.amount.toLocaleString()}
                  </span>
                </div>
                <div style={{ color:'var(--text2)', fontSize:13 }}>{f.desc}</div>
                <div style={{ color:'var(--text3)', fontSize:11, marginTop:3 }}>Due: {f.due}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <HESectionLabel>Subject Progress</HESectionLabel>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
          {d.subjects.map((s, i) => (
            <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <div style={{ color:'var(--text3)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.code}</div>
                  <div style={{ color:'var(--text1)', fontWeight:600, fontSize:13, marginTop:2 }}>{s.name}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color: window.gradeColor(s.grade), fontFamily:'Oswald', fontWeight:800, fontSize:22 }}>{s.grade}</div>
                  <div style={{ color:'var(--text3)', fontSize:11 }}>Att: {s.att}%</div>
                </div>
              </div>
              <HEProgress value={s.progress} color={window.gradeColor(s.grade)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StudentAttendance = ({ d, lang }) => {
  const days = Array.from({length:30},(_,i)=>i+1);
  const { present, absent, late } = d.attCalendar;
  const getDotColor = (day) => {
    if (present.includes(day)) return '#16A34A';
    if (absent.includes(day)) return '#DC2626';
    if (late.includes(day)) return '#F59E0B';
    return 'transparent';
  };
  const getBorder = (day) => {
    if (present.includes(day)) return 'rgba(22,163,74,0.3)';
    if (absent.includes(day)) return 'rgba(220,38,38,0.3)';
    if (late.includes(day)) return 'rgba(245,158,11,0.3)';
    return 'var(--border)';
  };
  return (
    <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:24 }}>Attendance Record</div>
        <div style={{ color:'var(--text3)', fontSize:13, marginTop:4 }}>June 2026 — {d.attendance}% overall rate</div>
      </div>
      <div style={{ display:'flex', gap:16 }}>
        {[{label:'Present',count:present.length,color:'#16A34A'},{label:'Absent',count:absent.length,color:'#DC2626'},{label:'Late',count:late.length,color:'#F59E0B'}].map(s=>(
          <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 20px', flex:1, textAlign:'center' }}>
            <div style={{ color:s.color, fontFamily:'Oswald', fontWeight:800, fontSize:28 }}>{s.count}</div>
            <div style={{ color:'var(--text3)', fontSize:12, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 20px', flex:1, textAlign:'center' }}>
          <div style={{ color: d.attendance >= 80?'#86EFAC':d.attendance>=65?'#FCD34D':'#FCA5A5', fontFamily:'Oswald', fontWeight:800, fontSize:28 }}>{d.attendance}%</div>
          <div style={{ color:'var(--text3)', fontSize:12, marginTop:2 }}>Rate</div>
        </div>
      </div>
      <div>
        <HESectionLabel>June 2026 Calendar</HESectionLabel>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(10,1fr)', gap:6 }}>
          {days.map(day => (
            <div key={day} style={{ background:getDotColor(day)+'18', border:`1px solid ${getBorder(day)}`,
              borderRadius:8, padding:'8px 4px', textAlign:'center', cursor:'default' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)' }}>{day}</div>
              {getDotColor(day) !== 'transparent' && (
                <div style={{ width:6, height:6, borderRadius:'50%', background:getDotColor(day), margin:'4px auto 0' }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:16, marginTop:12 }}>
          {[['#16A34A','Present'],['#DC2626','Absent'],['#F59E0B','Late']].map(([c,l])=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:c }} />
              <span style={{ color:'var(--text3)', fontSize:12 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <HESectionLabel>By Subject</HESectionLabel>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {d.subjects.map((s, i) => (
            <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ color:'var(--text1)', fontWeight:600, fontSize:13 }}>{s.name}</div>
                <div style={{ color: s.att>=80?'#86EFAC':s.att>=65?'#FCD34D':'#FCA5A5', fontWeight:700, fontSize:14 }}>{s.att}%</div>
              </div>
              <HEProgress value={s.att} color={s.att>=80?'#16A34A':s.att>=65?'#D97706':'#DC2626'} />
              {s.att < 80 && <div style={{ color:'#FCA5A5', fontSize:11, marginTop:6 }}>⚠ Below 80% minimum attendance requirement</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StudentFees = ({ d }) => (
  <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
      <div>
        <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:24 }}>Fee Management</div>
        <div style={{ color:'var(--text3)', fontSize:13, marginTop:4 }}>Manage your tuition fees and payments</div>
      </div>
      <HEBtn icon="download" variant="secondary">Download Statement</HEBtn>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
      <HEStatCard icon="fees" label="Total Outstanding" value={d.fees.filter(f=>f.status!=='paid').reduce((a,b)=>a+b.amount,0)} format="currency" accent="#DC2626" />
      <HEStatCard icon="check" label="Paid This Semester" value={d.fees.filter(f=>f.status==='paid').reduce((a,b)=>a+b.amount,0)} format="currency" accent="#16A34A" />
      <HEStatCard icon="wallet" label="Wallet Balance" value={d.walletBal} format="currency" accent="#F59E0B" />
    </div>
    <div>
      <HESectionLabel>Invoice Details</HESectionLabel>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'var(--surface2)' }}>
              {['Description','Amount','Due Date','Status','Action'].map(h=>(
                <th key={h} style={{ padding:'10px 16px', color:'var(--text3)', fontSize:11,
                  fontWeight:700, textAlign:'left', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.fees.map((f, i) => (
              <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                <td style={{ padding:'12px 16px', color:'var(--text1)', fontSize:13 }}>{f.desc}</td>
                <td style={{ padding:'12px 16px', color:'var(--text1)', fontWeight:700, fontSize:14, fontFamily:'Oswald' }}>RM {f.amount.toLocaleString()}</td>
                <td style={{ padding:'12px 16px', color:'var(--text2)', fontSize:13 }}>{f.due}</td>
                <td style={{ padding:'12px 16px' }}><HEBadge variant={f.status}>{f.status.charAt(0).toUpperCase()+f.status.slice(1)}</HEBadge></td>
                <td style={{ padding:'12px 16px' }}>
                  {f.status !== 'paid' && <HEBtn variant="primary" small>Pay Now</HEBtn>}
                  {f.status === 'paid' && <HEBtn variant="ghost" small icon="download">Receipt</HEBtn>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <div>
      <HESectionLabel>E-Wallet · Recent Transactions</HESectionLabel>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border)' }}>
          <div>
            <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>Balance</div>
            <div style={{ color:'#FCD34D', fontFamily:'Oswald', fontWeight:800, fontSize:28 }}>RM {d.walletBal.toFixed(2)}</div>
          </div>
          <HEBtn variant="gold" icon="plus">Top Up</HEBtn>
        </div>
        {d.wallet.map((tx, i) => (
          <div key={i} style={{ padding:'12px 20px', display:'flex', justifyContent:'space-between',
            alignItems:'center', borderBottom: i<d.wallet.length-1?'1px solid var(--border)':'none' }}>
            <div>
              <div style={{ color:'var(--text1)', fontSize:13, fontWeight:500 }}>{tx.desc}</div>
              <div style={{ color:'var(--text3)', fontSize:11, marginTop:2 }}>{tx.date}</div>
            </div>
            <div style={{ color: tx.amt>0?'#86EFAC':'#FCA5A5', fontWeight:700, fontSize:14, fontFamily:'Oswald' }}>
              {tx.amt>0?'+':''}{tx.amt.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const StudentPortal = ({ screen, setScreen, lang }) => {
  const d = window.HE_MOCK.student;
  const screens = {
    dashboard: <StudentDashboard d={d} lang={lang} />,
    attendance: <StudentAttendance d={d} lang={lang} />,
    fees: <StudentFees d={d} />,
    timetable: <StudentTimetable d={d} />,
    results: <StudentResults d={d} />,
    wallet: <StudentWalletFull d={d} />,
    messages: <StudentMessages />,
    profile: <StudentProfilePage d={d} />,
    location: <StudentLocationPage />,
  };
  return screens[screen] || screens.dashboard;
};

// ─── TEACHER PORTAL ──────────────────────────────────────────
const TeacherDashboard = ({ d, lang }) => {
  const overallGrade = window.gradeColor(d.grade);
  return (
    <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color:'var(--text3)', fontSize:13, marginBottom:4 }}>Teacher Dashboard</div>
          <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:800, fontSize:30 }}>{d.name}</div>
          <div style={{ color:'var(--text2)', fontSize:13, marginTop:4 }}>{d.dept} · <span style={{fontFamily:'monospace',color:'var(--text3)'}}>{d.id}</span></div>
        </div>
        <div style={{ background:'rgba(27,61,140,0.12)', border:'1px solid rgba(27,61,140,0.25)', borderRadius:14, padding:'16px 24px', textAlign:'center' }}>
          <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>KPI Score</div>
          <div style={{ color: overallGrade, fontFamily:'Oswald', fontWeight:800, fontSize:40, lineHeight:1 }}>{d.kpi}</div>
          <div style={{ color: overallGrade, fontWeight:700, fontSize:14, marginTop:4 }}>Grade {d.grade}</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {d.pillars.map(p => (
          <div key={p.name} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ color:'var(--text2)', fontSize:12, fontWeight:600, lineHeight:1.3 }}>{p.name}</div>
              <div style={{ color: window.gradeColor(p.grade), fontFamily:'Oswald', fontWeight:800, fontSize:20 }}>{p.grade}</div>
            </div>
            <HEProgress value={p.score} color={p.color} />
            <div style={{ color:'var(--text3)', fontSize:11, marginTop:6 }}>{p.score}/100 · {p.weight}% weight</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:20 }}>
        <div>
          <HESectionLabel>Today's Classes</HESectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {d.classes.map((cls, i) => (
              <div key={i} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
                padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ background:'rgba(27,61,140,0.12)', borderRadius:8, padding:'8px 14px', textAlign:'center', flexShrink:0 }}>
                  <div style={{ color:'#93B4FF', fontFamily:'Oswald', fontWeight:700, fontSize:16 }}>{cls.time}</div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'var(--text1)', fontWeight:600, fontSize:14 }}>{cls.name}</div>
                  <div style={{ color:'var(--text3)', fontSize:12, marginTop:2 }}>{cls.code} · {cls.room} · {cls.students} students</div>
                </div>
                <HEBadge variant={cls.type}>{cls.type==='remote'?'💻 Online':'🏫 Campus'}</HEBadge>
              </div>
            ))}
          </div>
        </div>
        <div>
          <HESectionLabel>Upcoming Deadlines</HESectionLabel>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {d.deadlines.map((dl, i) => (
              <div key={i} style={{ background:'var(--surface)', border:`1px solid ${dl.priority==='high'?'rgba(220,38,38,0.25)':'var(--border)'}`,
                borderRadius:10, padding:'12px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <HEBadge variant={dl.priority==='high'?'red':dl.priority==='medium'?'gold':'green'}>
                    {dl.priority.charAt(0).toUpperCase()+dl.priority.slice(1)}
                  </HEBadge>
                  <span style={{ color:'var(--text3)', fontSize:11 }}>{dl.due}</span>
                </div>
                <div style={{ color:'var(--text2)', fontSize:12, marginTop:4, lineHeight:1.4 }}>{dl.task}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TeacherKPI = ({ d }) => (
  <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div>
        <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:24 }}>KPI Report — June 2026</div>
        <div style={{ color:'var(--text3)', fontSize:13, marginTop:4 }}>Overall Score: <strong style={{color: window.gradeColor(d.grade)}}>{d.kpi} / 100 · Grade {d.grade}</strong></div>
      </div>
      <HEBtn icon="download" variant="secondary">Export PDF</HEBtn>
    </div>
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ color:'var(--text2)', fontSize:14, fontWeight:600 }}>Overall KPI Progress</div>
        <div style={{ color: window.gradeColor(d.grade), fontFamily:'Oswald', fontWeight:800, fontSize:24 }}>{d.kpi}%</div>
      </div>
      <HEProgress value={d.kpi} color={window.gradeColor(d.grade)} height={10} />
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 }}>
      {d.pillars.map(p => <HEPillar key={p.name} p={p} />)}
    </div>
    <div>
      <HESectionLabel>Improvement Areas</HESectionLabel>
      <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, padding:'16px 20px' }}>
        <div style={{ color:'#FCD34D', fontWeight:600, fontSize:14, marginBottom:8 }}>💡 Recommendations</div>
        {[
          'Student Outcomes (35% weight) — focus on improving class pass rate and student satisfaction scores',
          'R&D Activities (15% weight) — log additional training hours or certifications before month-end',
        ].map((rec,i)=>(
          <div key={i} style={{ color:'var(--text2)', fontSize:13, lineHeight:1.6, paddingLeft:16, borderLeft:'2px solid rgba(245,158,11,0.3)', marginBottom: i===0?10:0 }}>{rec}</div>
        ))}
      </div>
    </div>
  </div>
);

const TeacherOTP = ({ d }) => {
  const [secs, setSecs] = useState(d.otpSecs);
  const [active, setActive] = useState(true);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSecs(s => { if (s<=1){setActive(false); return 0;} return s-1; }), 1000);
    return () => clearInterval(t);
  }, [active]);
  const mins = String(Math.floor(secs/60)).padStart(2,'0');
  const secStr = String(secs%60).padStart(2,'0');
  const pct = (secs / d.otpSecs) * 100;
  return (
    <div style={{ padding:'28px 32px', display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:24 }}>Attendance OTP</div>
        <div style={{ color:'var(--text3)', fontSize:13, marginTop:4 }}>Generate a one-time code for students to mark attendance</div>
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'32px', textAlign:'center', maxWidth:480, margin:'0 auto', width:'100%' }}>
        <div style={{ color:'var(--text3)', fontSize:13, marginBottom:8 }}>{d.otpClass}</div>
        <div style={{ background:'rgba(27,61,140,0.1)', border:'1px solid rgba(27,61,140,0.2)', borderRadius:12, padding:'24px 32px', marginBottom:24 }}>
          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:48, fontWeight:700,
            color:'#93B4FF', letterSpacing:'0.2em', lineHeight:1 }}>
            {active ? d.otpCode : '— — — —'}
          </div>
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ color:'var(--text3)', fontSize:12 }}>Time remaining</span>
            <span style={{ color: secs<120?'#FCA5A5':'var(--text2)', fontFamily:'monospace', fontSize:14, fontWeight:600 }}>{mins}:{secStr}</span>
          </div>
          <HEProgress value={pct} color={secs<120?'#DC2626':secs<300?'#F59E0B':'#1B3D8C'} height={8} />
        </div>
        {!active
          ? <HEBtn icon="refresh" onClick={()=>{setSecs(d.otpSecs); setActive(true);}}>Generate New OTP</HEBtn>
          : <HEBtn variant="secondary" icon="eye">Share on Screen</HEBtn>
        }
      </div>
      <div>
        <HESectionLabel>Today's Attendance — EAP301</HESectionLabel>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--surface2)' }}>
                {['Student','ID','Status'].map(h=>(
                  <th key={h} style={{ padding:'10px 16px', color:'var(--text3)', fontSize:11, fontWeight:700, textAlign:'left', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.attStudents.map((s, i) => (
                <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'11px 16px' }}><div style={{ display:'flex', alignItems:'center', gap:10 }}><HEAvatar name={s.name} size={28} /><span style={{ color:'var(--text1)', fontSize:13, fontWeight:500 }}>{s.name}</span></div></td>
                  <td style={{ padding:'11px 16px', color:'var(--text3)', fontFamily:'monospace', fontSize:12 }}>{s.id}</td>
                  <td style={{ padding:'11px 16px' }}><HEBadge variant={s.status}>{s.status.charAt(0).toUpperCase()+s.status.slice(1)}</HEBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TeacherPortal = ({ screen, lang }) => {
  const d = window.HE_MOCK.teacher;
  const screens = {
    dashboard: <TeacherDashboard d={d} lang={lang} />,
    kpi: <TeacherKPI d={d} />,
    attendance: <TeacherOTP d={d} />,
    grades: <TeacherGradeEntry d={d} />,
    timetable: <HEComingSoon name="Timetable" />,
    students: <TeacherStudentProgress d={d} />,
    leave: <TeacherLeaveManagement d={d} />,
    profile: <TeacherProfilePage d={d} />,
    messages: <TeacherMessagesPage d={d} />,
  };
  return screens[screen] || screens.dashboard;
};

Object.assign(window, { StudentPortal, TeacherPortal });
