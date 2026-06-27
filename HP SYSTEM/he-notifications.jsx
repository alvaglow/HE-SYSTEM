// HE-SYSTEM — Notifications Panel (slide-out overlay)
const { useState } = React;

const NOTIF_DATA = {
  student: [
    {id:1,type:'fee',urgent:true,title:'Tuition Fee Overdue',msg:'Tuition Fee — Semester 3 (RM 3,200) is 6 days overdue. Pay now to avoid suspension.',time:'2h ago',read:false,action:'Pay Now'},
    {id:2,type:'attendance',urgent:true,title:'Low Attendance Warning',msg:'Your attendance in Writing for IELTS has dropped to 79%. Minimum required is 80%.',time:'5h ago',read:false,action:'View Record'},
    {id:3,type:'grade',urgent:false,title:'New Grade Posted',msg:'Assignment 2 — EAP301 has been marked: B+ (76/100). Check your results page.',time:'Yesterday',read:false,action:'View Grade'},
    {id:4,type:'system',urgent:false,title:'OTP Session Active',msg:'Ms. Linh Tran has started an OTP attendance session for EAP301. Enter code now.',time:'Today 08:05',read:true,action:'Enter OTP'},
    {id:5,type:'academic',urgent:false,title:'Exam Schedule Released',msg:'Semester 3 final exams begin June 30. Download your timetable from the Results page.',time:'2 days ago',read:true,action:'View'},
    {id:6,type:'system',urgent:false,title:'Library Book Due',msg:'\'Academic Writing Skills\' is due back June 12. Renew online to avoid a fine.',time:'3 days ago',read:true},
  ],
  teacher: [
    {id:1,type:'deadline',urgent:true,title:'Grade Submission Deadline',msg:'Mid-term grades for EAP301 must be submitted by June 10 (3 days remaining).',time:'1h ago',read:false,action:'Submit Grades'},
    {id:2,type:'system',urgent:false,title:'Monthly Report Reminder',msg:'Your June monthly report is due in 8 days. Access via KPI dashboard.',time:'3h ago',read:false,action:'Open Report'},
    {id:3,type:'attendance',urgent:false,title:'Student Attendance Alert',msg:'Nguyen Duc Anh has been absent 5 times this month in EAP301 — at-risk.',time:'Yesterday',read:true,action:'Contact Student'},
    {id:4,type:'system',urgent:false,title:'Leave Approved',msg:'Your annual leave request for June 20–22 has been approved by management.',time:'2 days ago',read:true},
  ],
  admin: [
    {id:1,type:'fee',urgent:true,title:'23 Overdue Invoices',msg:'RM 187,400 outstanding across 23 student accounts. Oldest overdue: 45 days.',time:'30m ago',read:false,action:'View Invoices'},
    {id:2,type:'enrolment',urgent:false,title:'New Enrolment Applications',msg:'5 new student applications pending review for July 2026 intake.',time:'2h ago',read:false,action:'Review'},
    {id:3,type:'system',urgent:false,title:'Timetable Clash Detected',msg:'A scheduling conflict was found in the Week 3 timetable — Block B, Thursday 10:00.',time:'4h ago',read:false,action:'Resolve'},
    {id:4,type:'system',urgent:false,title:'Document Expiry Alert',msg:'3 staff work permits expire within 30 days. Update in Staff Directory.',time:'Yesterday',read:true,action:'View Staff'},
    {id:5,type:'system',urgent:false,title:'System Maintenance',msg:'Scheduled maintenance on June 15, 02:00–04:00 AM. Portal will be unavailable.',time:'2 days ago',read:true},
  ],
  management: [
    {id:1,type:'kpi',urgent:true,title:'KPI Critical Alert',msg:'2 teachers rated Grade D this month. Intervention meetings must be scheduled within 7 days.',time:'1h ago',read:false,action:'View KPI'},
    {id:2,type:'fee',urgent:true,title:'Revenue Behind Target',msg:'June revenue is 14.3% below monthly target. 23 overdue invoices totalling RM 187K.',time:'3h ago',read:false,action:'View Finance'},
    {id:3,type:'enrolment',urgent:false,title:'Enrolment Milestone',msg:'Reached 1,247 active students — 83% of annual target. Strong growth in IELTS programme.',time:'Yesterday',read:true},
    {id:4,type:'system',urgent:false,title:'Board Meeting Report Ready',msg:'Q2 2026 performance report has been compiled and is ready for review.',time:'2 days ago',read:true,action:'Download'},
  ],
  partner: [
    {id:1,type:'commission',urgent:false,title:'Commission Payout Processed',msg:'May 2026 commission of RM 12,992 has been transferred to your registered bank account.',time:'2 days ago',read:false,action:'View Statement'},
    {id:2,type:'system',urgent:false,title:'Tier Progress Update',msg:'You are 23 students away from reaching Platinum tier (35% commission rate).',time:'3 days ago',read:true,action:'View Progress'},
  ],
  parent: [
    {id:1,type:'attendance',urgent:true,title:'Attendance Alert — Van An',msg:'Nguyen Van An was absent yesterday (Jun 6). This brings attendance to 85%.',time:'1h ago',read:false,action:'Contact School'},
    {id:2,type:'fee',urgent:true,title:'Fee Payment Overdue',msg:'Tuition Fee — Semester 3 (RM 3,200) due Jul 1 is approaching. Pay now to avoid late fees.',time:'5h ago',read:false,action:'Pay Now'},
    {id:3,type:'grade',urgent:false,title:'Mid-term Results — Van An',msg:'Mid-term results have been published. Van An\'s GPA this semester: 3.42 (B+).',time:'Yesterday',read:true,action:'View Results'},
  ],
};

const TYPE_CONFIG = {
  fee:        {color:'#DC2626',bg:'rgba(220,38,38,0.12)',icon:'fees',label:'Fees'},
  attendance: {color:'#F59E0B',bg:'rgba(245,158,11,0.12)',icon:'attendance',label:'Attendance'},
  grade:      {color:'#3B82F6',bg:'rgba(59,130,246,0.12)',icon:'grades',label:'Academic'},
  academic:   {color:'#3B82F6',bg:'rgba(59,130,246,0.12)',icon:'grades',label:'Academic'},
  kpi:        {color:'#7C3AED',bg:'rgba(124,58,237,0.12)',icon:'kpi',label:'KPI'},
  deadline:   {color:'#DC2626',bg:'rgba(220,38,38,0.12)',icon:'exclamation',label:'Deadline'},
  enrolment:  {color:'#16A34A',bg:'rgba(22,163,74,0.12)',icon:'enrolment',label:'Enrolment'},
  commission: {color:'#F59E0B',bg:'rgba(245,158,11,0.12)',icon:'commission',label:'Commission'},
  system:     {color:'#64748B',bg:'rgba(100,116,139,0.12)',icon:'info',label:'System'},
};

const HENotifPanel = ({ role, onClose }) => {
  const raw = NOTIF_DATA[role] || [];
  const [notifs, setNotifs] = useState(raw);
  const [tab, setTab] = useState('all');

  const filtered = tab === 'all' ? notifs
    : tab === 'unread' ? notifs.filter(n => !n.read)
    : notifs.filter(n => n.type === tab || (tab === 'academic' && (n.type === 'grade' || n.type === 'academic')));

  const unreadCount = notifs.filter(n => !n.read).length;
  const markAll = () => setNotifs(ns => ns.map(n => ({...n, read:true})));
  const markOne = (id) => setNotifs(ns => ns.map(n => n.id === id ? {...n, read:true} : n));

  const tabs = ['all','unread','fee','attendance','academic','system'].filter(t =>
    t === 'all' || t === 'unread' || notifs.some(n => {
      if (t === 'academic') return n.type === 'grade' || n.type === 'academic';
      if (t === 'fee') return n.type === 'fee';
      if (t === 'attendance') return n.type === 'attendance';
      if (t === 'system') return n.type === 'system' || n.type === 'kpi' || n.type === 'deadline' || n.type === 'enrolment' || n.type === 'commission';
      return n.type === t;
    })
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:900, backdropFilter:'blur(2px)', animation:'fadeIn 0.15s ease' }} />

      {/* Panel */}
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:380, background:'var(--sidebar-bg)',
        borderLeft:'1px solid var(--border)', zIndex:901, display:'flex', flexDirection:'column',
        boxShadow:'-8px 0 32px rgba(0,0,0,0.35)', animation:'slideInRight 0.22s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div style={{ padding:'18px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ color:'var(--text1)', fontFamily:'Oswald', fontWeight:700, fontSize:18 }}>Notifications</div>
            {unreadCount > 0 && <div style={{ color:'var(--text3)', fontSize:12, marginTop:2 }}>{unreadCount} unread</div>}
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {unreadCount > 0 && (
              <button onClick={markAll} style={{ background:'transparent', border:'none', color:'#93B4FF', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, padding:'5px 9px', color:'var(--text2)', cursor:'pointer', fontSize:16, lineHeight:1, transition:'all 150ms' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}>×</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, padding:'10px 14px', borderBottom:'1px solid var(--border)', flexWrap:'wrap', flexShrink:0 }}>
          {tabs.map(t => {
            const labels = {all:'All',unread:`Unread (${unreadCount})`,fee:'Fees',attendance:'Attendance',academic:'Academic',system:'System'};
            return (
              <button key={t} onClick={()=>setTab(t)}
                style={{ padding:'4px 10px', borderRadius:20, cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight:600, transition:'all 150ms',
                  background:tab===t?'#1B3D8C':' transparent', border:tab===t?'1px solid rgba(27,61,140,0.4)':'1px solid var(--border)',
                  color:tab===t?'#93B4FF':'var(--text3)', whiteSpace:'nowrap' }}>
                {labels[t] || t}
              </button>
            );
          })}
        </div>

        {/* Items */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'48px 24px', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🎉</div>
              <div style={{ color:'var(--text1)', fontWeight:600, fontSize:15 }}>All caught up!</div>
              <div style={{ color:'var(--text3)', fontSize:13, marginTop:4 }}>No notifications here.</div>
            </div>
          ) : filtered.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
            return (
              <div key={n.id} onClick={() => markOne(n.id)}
                style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                  background: n.read ? 'transparent' : 'rgba(27,61,140,0.05)', position:'relative',
                  transition:'background 150ms' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                onMouseLeave={e=>e.currentTarget.style.background=n.read?'transparent':'rgba(27,61,140,0.05)'}>

                {/* Unread dot */}
                {!n.read && <div style={{ position:'absolute', left:6, top:'50%', transform:'translateY(-50%)', width:5, height:5, borderRadius:'50%', background:'#1B3D8C' }} />}

                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  {/* Icon */}
                  <div style={{ width:36, height:36, borderRadius:10, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {n.urgent
                      ? <span style={{ fontSize:16 }}>🚨</span>
                      : <HEIcon name={cfg.icon} size={16} color={cfg.color} />}
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:4 }}>
                      <div style={{ color: n.read?'var(--text2)':'var(--text1)', fontWeight:n.read?500:700, fontSize:13, lineHeight:1.3 }}>{n.title}</div>
                      {n.urgent && <span style={{ background:'rgba(220,38,38,0.15)', color:'#FCA5A5', fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, flexShrink:0, letterSpacing:'0.04em' }}>URGENT</span>}
                    </div>
                    <div style={{ color:'var(--text3)', fontSize:12, lineHeight:1.5, marginBottom:6 }}>{n.msg}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ color:'var(--text3)', fontSize:11 }}>{n.time}</span>
                      {n.action && (
                        <span style={{ color:'#93B4FF', fontSize:11, fontWeight:600 }}>{n.action} →</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <button style={{ width:'100%', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px', color:'var(--text2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 150ms' }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='var(--surface)'}>
            View All Notifications
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
};

window.NOTIF_DATA = NOTIF_DATA;
Object.assign(window, { HENotifPanel });
