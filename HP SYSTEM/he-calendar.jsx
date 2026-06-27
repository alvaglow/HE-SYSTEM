// HE-SYSTEM — Academic Calendar Overlay (shared across all portals)
const { useState } = React;

const CAL_EVENTS = [
  {date:'2026-06-08',title:'Enrolment Deadline',sub:'July 2026 intake closes',type:'enrolment',color:'#1B3D8C'},
  {date:'2026-06-10',title:'Grade Submission',sub:'Mid-term marks due — all teachers',type:'deadline',color:'#DC2626'},
  {date:'2026-06-10',title:'Essay Due — EAP301',sub:'Mid-term essay submission',type:'assessment',color:'#DC2626'},
  {date:'2026-06-12',title:'Tuition Fee Deadline',sub:'Semester 3 payment due',type:'fee',color:'#F59E0B'},
  {date:'2026-06-13',title:'July Intake Opens',sub:'New student enrolment begins',type:'enrolment',color:'#1B3D8C'},
  {date:'2026-06-15',title:'Monthly Reports Due',sub:'All staff KPI reports submission',type:'deadline',color:'#DC2626'},
  {date:'2026-06-17',title:'KPI Review Meeting',sub:'Management & HOD review session',type:'meeting',color:'#7C3AED'},
  {date:'2026-06-18',title:'Public Holiday',sub:'Eid Al-Adha — Campus Closed',type:'holiday',color:'#16A34A'},
  {date:'2026-06-19',title:'Public Holiday',sub:'Eid Al-Adha (Day 2) — Campus Closed',type:'holiday',color:'#16A34A'},
  {date:'2026-06-20',title:'Graduation Ceremony',sub:'Cohort Jan 2023 — Happy English Hall',type:'graduation',color:'#D97706'},
  {date:'2026-06-22',title:'Partner Commission Due',sub:'May 2026 payouts processed',type:'finance',color:'#F59E0B'},
  {date:'2026-06-25',title:'Board Meeting',sub:'Q2 2026 performance review',type:'meeting',color:'#7C3AED'},
  {date:'2026-06-28',title:'Study Week Begins',sub:'No classes — exam preparation',type:'academic',color:'#0EA5E9'},
  {date:'2026-06-30',title:'Final Exams Begin',sub:'Semester 3 exam period starts',type:'exam',color:'#DC2626'},
  {date:'2026-07-04',title:'Enrolment Orientation',sub:'July 2026 new student orientation',type:'enrolment',color:'#1B3D8C'},
  {date:'2026-07-15',title:'Exam Period Ends',sub:'All Semester 3 finals completed',type:'exam',color:'#DC2626'},
  {date:'2026-07-20',title:'Results Released',sub:'Semester 3 results published',type:'academic',color:'#0EA5E9'},
];

const EVENT_TYPES = {
  exam:       {label:'Exam',       color:'#DC2626', bg:'rgba(220,38,38,0.15)'},
  assessment: {label:'Assessment', color:'#DC2626', bg:'rgba(220,38,38,0.15)'},
  deadline:   {label:'Deadline',   color:'#F87171', bg:'rgba(248,113,113,0.15)'},
  fee:        {label:'Fee',        color:'#F59E0B', bg:'rgba(245,158,11,0.15)'},
  finance:    {label:'Finance',    color:'#F59E0B', bg:'rgba(245,158,11,0.15)'},
  enrolment:  {label:'Enrolment', color:'#93B4FF', bg:'rgba(27,61,140,0.2)'},
  holiday:    {label:'Holiday',    color:'#86EFAC', bg:'rgba(22,163,74,0.15)'},
  graduation: {label:'Graduation', color:'#FCD34D', bg:'rgba(217,119,6,0.15)'},
  meeting:    {label:'Meeting',    color:'#C4B5FD', bg:'rgba(124,58,237,0.15)'},
  academic:   {label:'Academic',   color:'#7DD3FC', bg:'rgba(14,165,233,0.15)'},
};

const HECalendar = ({ role, onClose }) => {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5); // 0-indexed, June = 5
  const [selDate, setSelDate] = useState('2026-06-10');

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Convert to Mon-start

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y=>y+1); setMonth(0); } else setMonth(m=>m+1); };

  const eventsForDate = (d) => {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return CAL_EVENTS.filter(e => e.date === ds);
  };

  const selEvents = CAL_EVENTS.filter(e => e.date === selDate);
  const monthEvents = CAL_EVENTS.filter(e => e.date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`));

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:900, backdropFilter:'blur(3px)', animation:'fadeIn 0.15s ease' }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'min(960px, 95vw)',
        maxHeight:'90vh', background:'var(--sidebar-bg)', border:'1px solid var(--border)', borderRadius:20,
        zIndex:901, display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow:'0 24px 80px rgba(0,0,0,0.5)', animation:'scaleIn 0.22s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:20 }}>Academic Calendar</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 8px' }}>
              <button onClick={prevMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', padding:'2px 4px', borderRadius:4, fontSize:14, lineHeight:1 }}>‹</button>
              <span style={{ color:'var(--text1)', fontWeight:700, fontSize:14, minWidth:110, textAlign:'center' }}>{monthNames[month]} {year}</span>
              <button onClick={nextMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', padding:'2px 4px', borderRadius:4, fontSize:14, lineHeight:1 }}>›</button>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 10px', color:'var(--text2)', cursor:'pointer', fontSize:16, transition:'all 150ms' }}>×</button>
        </div>

        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          {/* Calendar grid */}
          <div style={{ flex:1, padding:'16px 20px', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Day headers */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:4 }}>
              {dayLabels.map(d => (
                <div key={d} style={{ textAlign:'center', color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', padding:'4px 0' }}>{d}</div>
              ))}
            </div>

            {/* Date cells */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, flex:1 }}>
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const evs = eventsForDate(d);
                const isToday = ds === todayStr;
                const isSel = ds === selDate;
                const isWeekend = (i % 7) >= 5;
                return (
                  <div key={i} onClick={() => setSelDate(ds)}
                    style={{ background: isSel?'rgba(27,61,140,0.2)':isToday?'rgba(27,61,140,0.08)':'transparent',
                      border:`1px solid ${isSel?'rgba(27,61,140,0.4)':isToday?'rgba(27,61,140,0.2)':'var(--border)'}`,
                      borderRadius:8, padding:'6px 5px', cursor:'pointer', minHeight:64,
                      transition:'all 150ms', display:'flex', flexDirection:'column', gap:2 }}
                    onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background='var(--surface2)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=isSel?'rgba(27,61,140,0.2)':isToday?'rgba(27,61,140,0.08)':'transparent'; }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                      <span style={{ fontSize:12, fontWeight: isToday||isSel?700:400,
                        color: isToday?'#93B4FF':isWeekend?'var(--text3)':'var(--text2)' }}>{d}</span>
                      {isToday && <span style={{ background:'#1B3D8C', color:'#fff', fontSize:7, fontWeight:700, padding:'1px 4px', borderRadius:3 }}>TODAY</span>}
                    </div>
                    {evs.slice(0,3).map((ev, j) => {
                      const cfg = EVENT_TYPES[ev.type] || {color:'#94A3B8', bg:'rgba(100,116,139,0.15)'};
                      return (
                        <div key={j} style={{ background:cfg.bg, borderRadius:4, padding:'2px 5px', overflow:'hidden' }}>
                          <div style={{ color:cfg.color, fontSize:9, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ev.title}</div>
                        </div>
                      );
                    })}
                    {evs.length > 3 && <div style={{ color:'var(--text3)', fontSize:8, paddingLeft:4 }}>+{evs.length-3} more</div>}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)' }}>
              {Object.entries({exam:'Exam/Assessment',fee:'Fee Deadline',enrolment:'Enrolment',holiday:'Holiday',graduation:'Graduation',meeting:'Meeting',academic:'Academic'}).map(([k,l]) => {
                const cfg = EVENT_TYPES[k];
                return (
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:cfg?.bg, border:`1px solid ${cfg?.color}` }} />
                    <span style={{ color:'var(--text3)', fontSize:10 }}>{l}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: selected day + month events */}
          <div style={{ width:280, borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
            {/* Selected day detail */}
            <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                {selDate ? new Date(selDate+'T12:00').toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'}) : 'Select a date'}
              </div>
              {selEvents.length === 0
                ? <div style={{ color:'var(--text3)', fontSize:13 }}>No events this day.</div>
                : selEvents.map((ev, i) => {
                    const cfg = EVENT_TYPES[ev.type] || {color:'#94A3B8', bg:'rgba(100,116,139,0.15)'};
                    return (
                      <div key={i} style={{ background:cfg.bg, border:`1px solid ${cfg.color}25`, borderRadius:10, padding:'12px 13px', marginBottom:8 }}>
                        <div style={{ color:cfg.color, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{EVENT_TYPES[ev.type]?.label||ev.type}</div>
                        <div style={{ color:'var(--text1)', fontWeight:600, fontSize:13 }}>{ev.title}</div>
                        <div style={{ color:'var(--text2)', fontSize:12, marginTop:3 }}>{ev.sub}</div>
                      </div>
                    );
                  })
              }
            </div>

            {/* Month event list */}
            <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
              <div style={{ color:'var(--text3)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
                {monthNames[month]} {year} — All Events
              </div>
              {monthEvents.length === 0
                ? <div style={{ color:'var(--text3)', fontSize:12 }}>No events this month.</div>
                : monthEvents.map((ev, i) => {
                    const cfg = EVENT_TYPES[ev.type] || {color:'#94A3B8'};
                    const dayNum = parseInt(ev.date.split('-')[2]);
                    return (
                      <div key={i} onClick={() => setSelDate(ev.date)}
                        style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'opacity 150ms' }}
                        onMouseEnter={e=>e.currentTarget.style.opacity='0.7'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                        <div style={{ width:28, height:28, borderRadius:6, background:cfg.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <span style={{ color:cfg.color, fontFamily:'Oswald', fontWeight:700, fontSize:12 }}>{dayNum}</span>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ color:'var(--text1)', fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.title}</div>
                          <div style={{ color:'var(--text3)', fontSize:10, marginTop:1 }}>{ev.sub}</div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: translate(-50%,-50%) scale(0.94); opacity: 0; }
          to   { transform: translate(-50%,-50%) scale(1);    opacity: 1; }
        }
      `}</style>
    </>
  );
};

Object.assign(window, { HECalendar });
