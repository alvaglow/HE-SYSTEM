// HE-SYSTEM — Student Screens: Timetable, Results, Wallet, Messages, Profile, Location
const { useState, useEffect } = React;

const WEEK = {
  Mon:[
    {time:'08:00–09:30',code:'EAP301',name:'English for Academic Purposes',room:'B-301',type:'campus',teacher:'Ms. Linh Tran',color:'#1B3D8C'},
    {time:'14:00–15:30',code:'WRT301',name:'Writing for IELTS',room:'C-105',type:'campus',teacher:'Ms. Phuong Nguyen',color:'#7C3AED'},
  ],
  Tue:[
    {time:'10:00–11:30',code:'LSP201',name:'Listening & Speaking',room:'Zoom',type:'remote',teacher:'Mr. James Wilson',color:'#0EA5E9'},
    {time:'15:00–16:30',code:'GRM201',name:'Grammar & Usage',room:'B-205',type:'campus',teacher:'Ms. Phuong Nguyen',color:'#D97706'},
  ],
  Wed:[
    {time:'08:00–09:30',code:'EAP301',name:'English for Academic Purposes',room:'B-301',type:'campus',teacher:'Ms. Linh Tran',color:'#1B3D8C'},
  ],
  Thu:[
    {time:'10:00–11:30',code:'LSP201',name:'Listening & Speaking',room:'Zoom',type:'remote',teacher:'Mr. James Wilson',color:'#0EA5E9'},
    {time:'13:00–14:30',code:'WRT301',name:'Writing for IELTS',room:'C-105',type:'campus',teacher:'Ms. Phuong Nguyen',color:'#7C3AED'},
  ],
  Fri:[
    {time:'09:00–10:30',code:'GRM201',name:'Grammar & Usage',room:'B-205',type:'campus',teacher:'Ms. Phuong Nguyen',color:'#D97706'},
  ],
};
const DAYS=['Mon','Tue','Wed','Thu','Fri'];
const DATES=['Jun 9','Jun 10','Jun 11','Jun 12','Jun 13'];

const StudentTimetable = ({ d }) => {
  const [sel, setSel] = useState(0);
  const total=Object.values(WEEK).flat().length;
  const online=Object.values(WEEK).flat().filter(c=>c.type==='remote').length;
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div>
          <div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Weekly Timetable</div>
          <div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Semester 3 · June 9–13, 2026</div>
        </div>
        <HEBtn icon="download" variant="secondary" small>Export PDF</HEBtn>
      </div>
      <div style={{display:'flex',gap:12}}>
        {[{l:'This Week',v:total,i:'timetable',c:'#1B3D8C'},{l:'On Campus',v:total-online,i:'location',c:'#16A34A'},{l:'Online',v:online,i:'mobile',c:'#0EA5E9'},{l:'Credit Hours',v:(total*1.5).toFixed(0)+'h',i:'star',c:'#F59E0B'}].map(s=>(
          <div key={s.l} style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',display:'flex',gap:10,alignItems:'center'}}>
            <div style={{width:34,height:34,borderRadius:8,background:s.c+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><HEIcon name={s.i} size={16} color={s.c==='#1B3D8C'?'#93B4FF':s.c==='#16A34A'?'#86EFAC':s.c==='#0EA5E9'?'#7DD3FC':'#FCD34D'}/></div>
            <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:20}}>{s.v}</div><div style={{color:'var(--text3)',fontSize:11}}>{s.l}</div></div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8}}>
        {DAYS.map((day,i)=>(
          <button key={day} onClick={()=>setSel(i)} style={{flex:1,padding:'12px 6px',borderRadius:10,cursor:'pointer',fontFamily:'inherit',border:'none',transition:'all 150ms',
            background:sel===i?'#1B3D8C':'var(--surface)',border:sel===i?'1px solid rgba(27,61,140,0.5)':'1px solid var(--border)',color:sel===i?'#fff':'var(--text2)'}}>
            <div style={{fontWeight:700,fontSize:13}}>{day}</div>
            <div style={{fontSize:10,opacity:0.6,marginTop:2}}>{DATES[i]}</div>
            <div style={{fontSize:10,marginTop:4,opacity:0.7}}>{(WEEK[day]||[]).length} class{(WEEK[day]||[]).length!==1?'es':''}</div>
          </button>
        ))}
      </div>
      <div>
        <HESectionLabel>{DAYS[sel]} — {DATES[sel]}</HESectionLabel>
        {(WEEK[DAYS[sel]]||[]).length===0
          ? <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'40px',textAlign:'center'}}><div style={{fontSize:36,marginBottom:10}}>🎉</div><div style={{color:'var(--text1)',fontWeight:600,fontSize:16}}>No Classes Today</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Free day — time to review!</div></div>
          : <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {(WEEK[DAYS[sel]]||[]).map((cls,i)=>(
                <div key={i} style={{background:'var(--surface)',border:`1px solid ${cls.color}30`,borderRadius:14,padding:'18px 20px',display:'flex',alignItems:'center',gap:16,position:'relative',overflow:'hidden',transition:'transform 200ms,box-shadow 200ms'}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateX(4px)';e.currentTarget.style.boxShadow=`0 8px 24px ${cls.color}20`;}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
                  <div style={{position:'absolute',left:0,top:0,bottom:0,width:4,background:cls.color}}/>
                  <div style={{background:cls.color+'18',borderRadius:10,padding:'10px 16px',textAlign:'center',minWidth:76,flexShrink:0}}>
                    <div style={{color:cls.color,fontFamily:'Oswald',fontWeight:700,fontSize:15}}>{cls.time.split('–')[0]}</div>
                    <div style={{color:'var(--text3)',fontSize:10,marginTop:2}}>–{cls.time.split('–')[1]}</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:5}}>
                      <span style={{color:cls.color,fontFamily:'Oswald',fontWeight:700,fontSize:12}}>{cls.code}</span>
                      <HEBadge variant={cls.type}>{cls.type==='remote'?'💻 Online':'🏫 Campus'}</HEBadge>
                    </div>
                    <div style={{color:'var(--text1)',fontWeight:600,fontSize:15}}>{cls.name}</div>
                    <div style={{color:'var(--text3)',fontSize:12,marginTop:4}}>👩‍🏫 {cls.teacher} &nbsp;·&nbsp; 📍 {cls.room}</div>
                  </div>
                  {cls.type==='remote'?<HEBtn variant="secondary" small>Join Zoom</HEBtn>:<HEBtn variant="ghost" small icon="map">Map</HEBtn>}
                </div>
              ))}
            </div>
        }
      </div>
      <div>
        <HESectionLabel>Week at a Glance</HESectionLabel>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',borderBottom:'1px solid var(--border)'}}>
            {DAYS.map((d,i)=><div key={d} style={{padding:'8px',textAlign:'center',borderRight:i<4?'1px solid var(--border)':'none',background:i===sel?'rgba(27,61,140,0.08)':'transparent'}}><div style={{color:i===sel?'#93B4FF':'var(--text2)',fontWeight:700,fontSize:12}}>{d}</div><div style={{color:'var(--text3)',fontSize:10}}>{DATES[i]}</div></div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)'}}>
            {DAYS.map((d,i)=>(
              <div key={d} style={{padding:'6px 5px',borderRight:i<4?'1px solid var(--border)':'none',minHeight:72,background:i===sel?'rgba(27,61,140,0.04)':'transparent'}}>
                {(WEEK[d]||[]).map((cls,j)=>(
                  <div key={j} style={{background:cls.color+'20',border:`1px solid ${cls.color}30`,borderRadius:5,padding:'3px 5px',marginBottom:3}}>
                    <div style={{color:cls.color,fontSize:9,fontWeight:700}}>{cls.code}</div>
                    <div style={{color:'var(--text3)',fontSize:8}}>{cls.time.split('–')[0]}</div>
                  </div>
                ))}
                {!(WEEK[d]||[]).length&&<div style={{color:'var(--text3)',fontSize:10,textAlign:'center',paddingTop:14}}>—</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentResults = ({ d }) => {
  const gp={'A':4.0,'A-':3.7,'B+':3.3,'B':3.0,'B-':2.7,'C+':2.3,'C':2.0,'D':1.0,'F':0.0};
  const allSubjects=[...d.subjects,{code:'MTH101',name:'Business Mathematics',att:88,grade:'B+',progress:76}];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Academic Results</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Semester 3 · Diploma in English Language</div></div>
        <HEBtn icon="download" variant="secondary">Download Transcript</HEBtn>
      </div>
      <div style={{background:'linear-gradient(135deg,rgba(27,61,140,0.15) 0%,rgba(22,163,74,0.08) 100%)',border:'1px solid rgba(27,61,140,0.25)',borderRadius:16,padding:'28px 32px',display:'flex',gap:32,alignItems:'center'}}>
        <div style={{textAlign:'center',flexShrink:0}}>
          <div style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Cumulative GPA</div>
          <div style={{fontFamily:'Oswald',fontWeight:800,fontSize:60,color:window.gradeColor('B+'),lineHeight:1}}>{d.gpa}</div>
          <div style={{color:window.gradeColor('B+'),fontWeight:700,fontSize:15,marginTop:4}}>B+ / 4.0 Scale</div>
        </div>
        <div style={{flex:1,borderLeft:'1px solid var(--border)',paddingLeft:32}}>
          <div style={{display:'flex',gap:28,marginBottom:16}}>
            {[{l:'Credits Done',v:'54'},{l:'Remaining',v:'18'},{l:'Grad',v:'Dec 2026'}].map(s=>(
              <div key={s.l}><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:22}}>{s.v}</div><div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{s.l}</div></div>
            ))}
          </div>
          <div style={{color:'var(--text3)',fontSize:12,marginBottom:6}}>Degree completion: 75%</div>
          <HEProgress value={75} color="#1B3D8C" height={8}/>
        </div>
      </div>
      <div>
        <HESectionLabel>Current Semester Subjects</HESectionLabel>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {allSubjects.map((s,i)=>(
            <div key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'18px 20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div><div style={{color:'var(--text3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{s.code}</div><div style={{color:'var(--text1)',fontWeight:600,fontSize:15}}>{s.name}</div></div>
                <div style={{textAlign:'right'}}><div style={{color:window.gradeColor(s.grade),fontFamily:'Oswald',fontWeight:800,fontSize:32,lineHeight:1}}>{s.grade}</div><div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{(gp[s.grade]||0).toFixed(1)} Grade Points</div></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:12}}>
                {[{l:'Attendance',v:s.att+'%',c:s.att>=80?'#86EFAC':'#FCA5A5'},{l:'Coursework',v:Math.round(s.progress*.4)+'%',c:'#93B4FF'},{l:'Final Exam',v:Math.round(s.progress*.6)+'%',c:'#FCD34D'}].map(m=>(
                  <div key={m.l} style={{textAlign:'center',background:'var(--surface2)',borderRadius:8,padding:'10px'}}>
                    <div style={{color:m.c,fontFamily:'Oswald',fontWeight:700,fontSize:18}}>{m.v}</div>
                    <div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{m.l}</div>
                  </div>
                ))}
              </div>
              <HEProgress value={s.progress} color={window.gradeColor(s.grade)}/>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                <span style={{color:'var(--text3)',fontSize:11}}>Overall: {s.progress}%</span>
                <span style={{color:s.att>=80?'#86EFAC':'#FCA5A5',fontSize:11,fontWeight:600}}>{s.att>=80?'✓ Attendance OK':'⚠ Low Attendance'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <HESectionLabel>Semester History</HESectionLabel>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          {[{sem:'Semester 1',year:'Jan 2024',gpa:3.18,status:'Completed'},{sem:'Semester 2',year:'Jul 2024',gpa:3.29,status:'Completed'},{sem:'Semester 3',year:'Jan 2025',gpa:d.gpa,status:'Current'}].map((s,i)=>(
            <div key={i} style={{padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:i<2?'1px solid var(--border)':'none'}}>
              <div><div style={{color:'var(--text1)',fontWeight:600,fontSize:14}}>{s.sem}</div><div style={{color:'var(--text3)',fontSize:12,marginTop:2}}>{s.year}</div></div>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <HEBadge variant={s.status==='Current'?'blue':'green'}>{s.status}</HEBadge>
                <div style={{textAlign:'right'}}><div style={{color:window.gradeColor('B+'),fontFamily:'Oswald',fontWeight:700,fontSize:20}}>{s.gpa}</div><div style={{color:'var(--text3)',fontSize:11}}>GPA</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StudentWalletFull = ({ d }) => {
  const [showTopUp,setShowTopUp]=useState(false);
  const [topAmt,setTopAmt]=useState(50);
  const allTx=[...d.wallet,{desc:'Canteen — Breakfast',amt:-8.00,date:'Jun 1'},{desc:'Top Up via Maybank',amt:50.00,date:'May 31'},{desc:'Study Materials — Bookshop',amt:-23.00,date:'May 30'}];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>E-Wallet</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Campus cashless payment system</div></div>
        <HEBtn icon="download" variant="secondary">Statement</HEBtn>
      </div>
      <div style={{background:'linear-gradient(135deg,#1B3D8C 0%,#2E5FCC 100%)',borderRadius:20,padding:'30px 32px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-50,right:-50,width:220,height:220,borderRadius:'50%',background:'rgba(255,255,255,0.05)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-60,left:20,width:160,height:160,borderRadius:'50%',background:'rgba(255,255,255,0.04)',pointerEvents:'none'}}/>
        <div style={{color:'rgba(255,255,255,0.65)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Available Balance</div>
        <div style={{fontFamily:'Oswald',fontWeight:800,fontSize:52,color:'#fff',lineHeight:1,marginBottom:6}}>RM {d.walletBal.toFixed(2)}</div>
        <div style={{color:'rgba(255,255,255,0.55)',fontSize:13,marginBottom:22}}>{d.name} · {d.id}</div>
        <div style={{display:'flex',gap:12}}>
          <button onClick={()=>setShowTopUp(s=>!s)} style={{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,padding:'9px 18px',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
            <HEIcon name="plus" size={14}/> Top Up
          </button>
          <button style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:10,padding:'9px 18px',color:'rgba(255,255,255,0.7)',fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
            <HEIcon name="eye" size={14}/> QR Code
          </button>
        </div>
      </div>
      {showTopUp&&(
        <div style={{background:'var(--surface)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:14,padding:'22px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}><div style={{color:'var(--text1)',fontWeight:700,fontSize:15}}>Quick Top Up</div><button onClick={()=>setShowTopUp(false)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:18,lineHeight:1}}>×</button></div>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            {[10,20,50,100,200].map(amt=>(
              <button key={amt} onClick={()=>setTopAmt(amt)} style={{flex:1,padding:'10px 4px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,transition:'all 150ms',
                background:topAmt===amt?'rgba(245,158,11,0.15)':'var(--surface2)',border:topAmt===amt?'1px solid rgba(245,158,11,0.4)':'1px solid var(--border)',color:topAmt===amt?'#FCD34D':'var(--text2)'}}>
                RM {amt}
              </button>
            ))}
          </div>
          <HEBtn variant="gold" style={{width:'100%',justifyContent:'center'}}>Top Up RM {topAmt} via Online Banking</HEBtn>
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {[{l:'Spent This Month',v:'RM 89.50',c:'#DC2626'},{l:'Topped Up',v:'RM 100.00',c:'#16A34A'},{l:'Most Used At',v:'Canteen',c:'#F59E0B'}].map(s=>(
          <div key={s.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px'}}>
            <div style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:5}}>{s.l}</div>
            <div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:18}}>{s.v}</div>
          </div>
        ))}
      </div>
      <div>
        <HESectionLabel>Transaction History</HESectionLabel>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          {allTx.map((tx,i)=>(
            <div key={i} style={{padding:'13px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:i<allTx.length-1?'1px solid var(--border)':'none',transition:'background 150ms'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:tx.amt>0?'rgba(22,163,74,0.12)':'rgba(220,38,38,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <HEIcon name={tx.amt>0?'arrowDown':'arrowUp'} size={15} color={tx.amt>0?'#86EFAC':'#FCA5A5'}/>
                </div>
                <div><div style={{color:'var(--text1)',fontWeight:500,fontSize:13}}>{tx.desc}</div><div style={{color:'var(--text3)',fontSize:11,marginTop:1}}>{tx.date}</div></div>
              </div>
              <div style={{color:tx.amt>0?'#86EFAC':'#FCA5A5',fontWeight:700,fontSize:15,fontFamily:'Oswald'}}>{tx.amt>0?'+':''}RM {Math.abs(tx.amt).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const THREADS=[
  {teacher:'Ms. Linh Tran',sub:'EAP301',unread:2,last:'Please review the essay guidelines.',time:'2h ago',msgs:[{from:'teacher',text:'Hi! Your mid-term essay is due this Friday.',time:'10:00'},{from:'student',text:'Thank you — I have a question about the format.',time:'10:15'},{from:'teacher',text:'Check the guidelines document on the portal.',time:'10:22'},{from:'teacher',text:'Please review the essay guidelines.',time:'10:23'}]},
  {teacher:'Mr. James Wilson',sub:'LSP201',unread:0,last:'Great work on last week\'s listening!',time:'Yesterday',msgs:[{from:'teacher',text:'Great work on last week\'s listening exercise! Score improved significantly.',time:'14:00'},{from:'student',text:'Thank you so much! I practiced a lot.',time:'14:30'}]},
  {teacher:'Ms. Phuong Nguyen',sub:'WRT301',unread:1,last:'Assignment 2 has been graded.',time:'2 days ago',msgs:[{from:'teacher',text:'Assignment 2 has been graded. Check your results.',time:'09:00'}]},
];

const StudentMessages = () => {
  const [active,setActive]=useState(0);
  const [msg,setMsg]=useState('');
  const t=THREADS[active];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:16,height:'calc(100vh - 130px)'}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Messages</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Communicate with your teachers</div></div>
      <div style={{flex:1,display:'flex',gap:16,minHeight:0}}>
        <div style={{width:250,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
          <div style={{padding:'10px 12px',borderBottom:'1px solid var(--border)'}}>
            <div style={{background:'var(--surface2)',borderRadius:8,padding:'7px 10px',display:'flex',alignItems:'center',gap:7,color:'var(--text3)'}}>
              <HEIcon name="search" size={13}/><input placeholder="Search..." style={{background:'none',border:'none',outline:'none',color:'var(--text2)',fontSize:12,fontFamily:'inherit',width:'100%'}}/>
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {THREADS.map((th,i)=>(
              <div key={i} onClick={()=>setActive(i)} style={{padding:'12px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:active===i?'rgba(27,61,140,0.1)':'transparent',transition:'background 150ms'}}>
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <HEAvatar name={th.teacher} size={34}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{color:'var(--text1)',fontWeight:600,fontSize:12}}>{th.teacher}</div>
                      {th.unread>0&&<div style={{width:15,height:15,borderRadius:'50%',background:'#DC2626',color:'#fff',fontSize:8,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{th.unread}</div>}
                    </div>
                    <div style={{color:'var(--text3)',fontSize:10,marginTop:1}}>{th.sub}</div>
                    <div style={{color:'var(--text2)',fontSize:11,marginTop:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{th.last}</div>
                    <div style={{color:'var(--text3)',fontSize:10,marginTop:2}}>{th.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12}}>
            <HEAvatar name={t.teacher} size={34}/><div><div style={{color:'var(--text1)',fontWeight:600,fontSize:14}}>{t.teacher}</div><div style={{color:'var(--text3)',fontSize:11}}>{t.sub}</div></div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'18px',display:'flex',flexDirection:'column',gap:10}}>
            {t.msgs.map((m,i)=>(
              <div key={i} style={{display:'flex',justifyContent:m.from==='student'?'flex-end':'flex-start',gap:8}}>
                {m.from==='teacher'&&<HEAvatar name={t.teacher} size={26}/>}
                <div style={{maxWidth:'68%'}}>
                  <div style={{background:m.from==='student'?'#1B3D8C':'var(--surface2)',borderRadius:m.from==='student'?'14px 14px 4px 14px':'14px 14px 14px 4px',padding:'9px 13px',color:m.from==='student'?'#fff':'var(--text1)',fontSize:13,lineHeight:1.55}}>{m.text}</div>
                  <div style={{color:'var(--text3)',fontSize:10,marginTop:3,textAlign:m.from==='student'?'right':'left'}}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
            <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type your message..." onKeyDown={e=>e.key==='Enter'&&msg.trim()&&setMsg('')}
              style={{flex:1,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
            <HEBtn variant="primary" onClick={()=>msg.trim()&&setMsg('')} icon="check">Send</HEBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentProfilePage = ({ d }) => {
  const [edit,setEdit]=useState(false);
  const fields=[{l:'Full Name',v:d.name},{l:'Student ID',v:d.id,ro:true},{l:'Email',v:'an.nguyen@student.happy.edu.vn'},{l:'Phone',v:'+84 912 345 678'},{l:'Date of Birth',v:'15 Mar 2002'},{l:'Nationality',v:'Vietnamese'},{l:'IC / Passport',v:'B01234567'},{l:'Emergency Contact',v:'+84 918 765 432'}];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>My Profile</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Manage your personal information</div></div>
        <HEBtn variant={edit?'primary':'secondary'} icon={edit?'check':'settings'} onClick={()=>setEdit(e=>!e)}>{edit?'Save Changes':'Edit Profile'}</HEBtn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:22}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'22px',textAlign:'center'}}>
            <div style={{display:'flex',justifyContent:'center',marginBottom:14}}><HEAvatar name={d.name} size={80}/></div>
            <div style={{color:'var(--text1)',fontWeight:700,fontSize:17}}>{d.name}</div>
            <div style={{color:'var(--text3)',fontFamily:'monospace',fontSize:12,marginTop:3}}>{d.id}</div>
            <div style={{marginTop:10}}><HEBadge variant="blue" dot>Active Student</HEBadge></div>
            {edit&&<HEBtn variant="secondary" small style={{marginTop:12,width:'100%',justifyContent:'center'}}>Upload Photo</HEBtn>}
          </div>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'18px'}}>
            <HESectionLabel>Academic Info</HESectionLabel>
            {[['Programme',d.programme],['Semester',`Sem ${d.semester}`],['Attendance',`${d.attendance}%`],['GPA',d.gpa.toString()]].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                <span style={{color:'var(--text3)',fontSize:13}}>{k}</span>
                <span style={{color:'var(--text1)',fontSize:13,fontWeight:500}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'22px'}}>
          <HESectionLabel>Personal Information</HESectionLabel>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {fields.map((f,i)=>(
              <div key={i}>
                <label style={{color:'var(--text3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>{f.l}</label>
                <input defaultValue={f.v} readOnly={!edit||f.ro} style={{width:'100%',background:edit&&!f.ro?'var(--surface2)':'transparent',border:edit&&!f.ro?'1px solid var(--border)':'1px solid transparent',borderBottom:'1px solid var(--border)',borderRadius:edit&&!f.ro?7:0,padding:edit&&!f.ro?'7px 10px':'6px 0',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none',transition:'all 200ms',opacity:f.ro?0.5:1}}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:22,paddingTop:18,borderTop:'1px solid var(--border)'}}>
            <HESectionLabel>Security</HESectionLabel>
            <div style={{display:'flex',gap:10}}>
              <HEBtn variant="secondary" icon="settings" small>Change Password</HEBtn>
              <HEBtn variant="secondary" icon="otp" small>2FA Settings</HEBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentLocationPage = () => {
  const [hov,setHov]=useState(null);
  const bldgs=[
    {n:'Block B — Main Classes',sub:'B-205, B-301, B-401',c:'#1B3D8C',x:28,y:18,w:28,h:38},
    {n:'Block C — Language Lab',sub:'C-101, C-105, C-201',c:'#16A34A',x:62,y:18,w:26,h:38},
    {n:'Library & Study Hub',sub:'Study rooms, Quiet zone',c:'#D97706',x:28,y:64,w:22,h:22},
    {n:'Admin & Finance Office',sub:'Enrolment, Fees, IT Help',c:'#7C3AED',x:55,y:64,w:22,h:22},
    {n:'Canteen & Café',sub:'Mon–Fri 7:30–18:00',c:'#DC2626',x:80,y:64,w:16,h:22},
  ];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Campus Map</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Happy English Campus · Ho Chi Minh City</div></div>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden',position:'relative',height:380}}>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#05090F 0%,#0a1020 100%)'}}>
            {[...Array(8)].map((_,i)=><div key={'h'+i} style={{position:'absolute',left:0,right:0,top:`${i*14.2}%`,height:1,background:'rgba(255,255,255,0.03)'}}/>)}
            {[...Array(8)].map((_,i)=><div key={'v'+i} style={{position:'absolute',top:0,bottom:0,left:`${i*14.2}%`,width:1,background:'rgba(255,255,255,0.03)'}}/>)}
          </div>
          <div style={{position:'absolute',top:14,right:14,width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontWeight:700,fontSize:11}}>N</div>
          {bldgs.map((b,i)=>(
            <div key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
              style={{position:'absolute',left:`${b.x}%`,top:`${b.y}%`,width:`${b.w}%`,height:`${b.h}%`,background:hov===i?b.c+'35':b.c+'18',border:`2px solid ${hov===i?b.c:b.c+'55'}`,borderRadius:8,cursor:'pointer',transition:'all 200ms',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'4px 6px'}}>
              <div style={{color:b.c,fontWeight:700,fontSize:9,lineHeight:1.3}}>{b.n.split(' — ')[0]}</div>
              {hov===i&&<div style={{color:'var(--text3)',fontSize:8,marginTop:2,lineHeight:1.3}}>{b.sub}</div>}
            </div>
          ))}
          <div style={{position:'absolute',left:'35%',top:'20%',display:'flex',flexDirection:'column',alignItems:'center',gap:2,pointerEvents:'none'}}>
            <div style={{background:'#DC2626',color:'#fff',padding:'3px 8px',borderRadius:6,fontSize:9,fontWeight:700,whiteSpace:'nowrap'}}>📍 B-301 Now</div>
            <div style={{width:2,height:10,background:'#DC2626'}}/>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <HESectionLabel>Buildings</HESectionLabel>
          {bldgs.map((b,i)=>(
            <div key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'11px 13px',cursor:'pointer',transition:'all 150ms'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=b.c+'50';setHov(i);}} onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';setHov(null);}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:b.c,flexShrink:0,marginTop:4}}/>
                <div><div style={{color:'var(--text1)',fontWeight:600,fontSize:12}}>{b.n}</div><div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{b.sub}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

Object.assign(window,{StudentTimetable,StudentResults,StudentWalletFull,StudentMessages,StudentProfilePage,StudentLocationPage});
