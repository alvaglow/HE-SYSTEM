// HE-SYSTEM — Teacher Screens: Grade Entry, Leave, Student Progress, Profile, Timetable, Messages
const { useState, useEffect } = React;

const TCH_STUDENTS = {
  EAP301:[
    {name:'Nguyen Van An',id:'APD21110001',ass1:72,ass2:75,final:70},
    {name:'Tran Van Binh',id:'APD21110045',ass1:85,ass2:88,final:82},
    {name:'Le Thi Hoa',id:'APD21110023',ass1:91,ass2:89,final:93},
    {name:'Nguyen Duc Anh',id:'APD21110067',ass1:55,ass2:60,final:58},
    {name:'Pham Thu Ha',id:'APD21110089',ass1:78,ass2:80,final:75},
    {name:'Vo Minh Khoa',id:'APD21110012',ass1:66,ass2:70,final:68},
  ],
  GRM201:[
    {name:'Bui Hoang Nam',id:'APD24050087',ass1:88,ass2:85,final:90},
    {name:'Nguyen Lan Anh',id:'APD21110023',ass1:72,ass2:68,final:70},
    {name:'Tran Quoc Bao',id:'APD24060001',ass1:95,ass2:92,final:94},
    {name:'Le Minh Chau',id:'APD24060002',ass1:60,ass2:62,final:58},
  ],
};

const GRADE_TABLE = (score) => {
  if(score>=90)return{g:'A',c:'#16A34A'};
  if(score>=80)return{g:'A-',c:'#22C55E'};
  if(score>=75)return{g:'B+',c:'#3B82F6'};
  if(score>=70)return{g:'B',c:'#60A5FA'};
  if(score>=65)return{g:'B-',c:'#93C5FD'};
  if(score>=60)return{g:'C+',c:'#D97706'};
  if(score>=55)return{g:'C',c:'#F59E0B'};
  if(score>=50)return{g:'D',c:'#DC2626'};
  return{g:'F',c:'#991B1B'};
};

const TeacherGradeEntry = ({ d }) => {
  const classes=['EAP301','GRM201'];
  const [cls,setCls]=useState('EAP301');
  const [grades,setGrades]=useState(()=>{
    const obj={};
    Object.entries(TCH_STUDENTS).forEach(([k,v])=>{
      obj[k]=v.map(s=>({...s}));
    });
    return obj;
  });
  const [saved,setSaved]=useState(false);

  const update=(classKey,idx,field,val)=>{
    setGrades(g=>{const n={...g,[classKey]:[...g[classKey]]};n[classKey][idx]={...n[classKey][idx],[field]:parseInt(val)||0};return n;});
    setSaved(false);
  };
  const overall=(s)=>Math.round(s.ass1*0.3+s.ass2*0.3+s.final*0.4);

  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Grade Entry</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Submit assessment marks for your classes</div></div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          {saved&&<span style={{color:'#86EFAC',fontSize:13,fontWeight:600}}>✓ Saved</span>}
          <HEBtn icon="check" variant="primary" onClick={()=>setSaved(true)}>Submit Grades</HEBtn>
        </div>
      </div>
      <div style={{display:'flex',gap:8}}>
        {classes.map(c=>(
          <button key={c} onClick={()=>setCls(c)} style={{padding:'9px 18px',borderRadius:9,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,transition:'all 150ms',
            background:cls===c?'#1B3D8C':'var(--surface)',border:cls===c?'1px solid rgba(27,61,140,0.5)':'1px solid var(--border)',color:cls===c?'#fff':'var(--text2)'}}>
            {c} &nbsp;<span style={{fontWeight:400,opacity:0.7}}>({TCH_STUDENTS[c].length} students)</span>
          </button>
        ))}
      </div>
      <div style={{background:'rgba(27,61,140,0.08)',border:'1px solid rgba(27,61,140,0.2)',borderRadius:10,padding:'10px 16px',fontSize:12,color:'var(--text2)'}}>
        <strong style={{color:'#93B4FF'}}>Weighting:</strong> &nbsp;Assessment 1 (30%) + Assessment 2 (30%) + Final Exam (40%) = 100%
      </div>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--surface2)'}}>
              {['#','Student','ID','Ass 1 (30%)','Ass 2 (30%)','Final (40%)','Overall','Grade'].map((h,i)=>(
                <th key={h} style={{padding:'10px 14px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:i<=2?'left':'center',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grades[cls].map((s,i)=>{
              const ov=overall(s);
              const {g,c}=GRADE_TABLE(ov);
              return (
                <tr key={i} style={{borderBottom:'1px solid var(--border)',transition:'background 150ms'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 14px',color:'var(--text3)',fontSize:13,textAlign:'left'}}>{i+1}</td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:9}}>
                      <HEAvatar name={s.name} size={28}/><span style={{color:'var(--text1)',fontSize:13,fontWeight:500}}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{padding:'10px 14px',color:'var(--text3)',fontFamily:'monospace',fontSize:11}}>{s.id}</td>
                  {['ass1','ass2','final'].map(f=>(
                    <td key={f} style={{padding:'6px 10px',textAlign:'center'}}>
                      <input type="number" min="0" max="100" value={s[f]} onChange={e=>update(cls,i,f,e.target.value)}
                        style={{width:60,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:6,padding:'5px 8px',color:'var(--text1)',fontSize:13,fontFamily:'Oswald',fontWeight:700,textAlign:'center',outline:'none',transition:'border-color 150ms'}}
                        onFocus={e=>e.target.style.borderColor='rgba(27,61,140,0.5)'}
                        onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                    </td>
                  ))}
                  <td style={{padding:'10px 14px',textAlign:'center',color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:15}}>{ov}%</td>
                  <td style={{padding:'10px 14px',textAlign:'center'}}>
                    <span style={{color:c,fontFamily:'Oswald',fontWeight:800,fontSize:18}}>{g}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {['A/A-','B+/B','C+/C','D/F'].map((range,i)=>{
          const counts=[grades[cls].filter(s=>overall(s)>=80).length,grades[cls].filter(s=>overall(s)>=70&&overall(s)<80).length,grades[cls].filter(s=>overall(s)>=55&&overall(s)<70).length,grades[cls].filter(s=>overall(s)<55).length];
          const cols=['#16A34A','#3B82F6','#D97706','#DC2626'];
          return (
            <div key={range} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px',textAlign:'center'}}>
              <div style={{color:cols[i],fontFamily:'Oswald',fontWeight:800,fontSize:26}}>{counts[i]}</div>
              <div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{range}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TeacherLeaveManagement = ({ d }) => {
  const [step,setStep]=useState('list');
  const [leaveType,setLeaveType]=useState('Annual');
  const balance={Annual:14,Medical:7,Emergency:3,Conference:5};
  const history=[
    {type:'Annual',from:'Apr 10',to:'Apr 11',days:2,status:'approved',reason:'Family event'},
    {type:'Medical',from:'Mar 5',to:'Mar 5',days:1,status:'approved',reason:'Doctor appointment'},
    {type:'Conference',from:'May 20',to:'May 21',days:2,status:'pending',reason:'English Teaching Conference HCM'},
    {type:'Annual',from:'Jun 20',to:'Jun 22',days:3,status:'pending',reason:'Personal leave'},
  ];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Leave Management</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Apply for and track your leave requests</div></div>
        {step==='list'
          ? <HEBtn icon="plus" variant="primary" onClick={()=>setStep('apply')}>Apply for Leave</HEBtn>
          : <HEBtn icon="close" variant="secondary" onClick={()=>setStep('list')}>Cancel</HEBtn>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {Object.entries(balance).map(([type,days])=>(
          <div key={type} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'16px',textAlign:'center'}}>
            <div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:800,fontSize:28}}>{days}</div>
            <div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{type} Leave</div>
            <div style={{color:'var(--text3)',fontSize:10,marginTop:4}}>days remaining</div>
            <HEProgress value={days/(type==='Annual'?20:type==='Medical'?10:type==='Emergency'?5:8)*100} color={type==='Annual'?'#1B3D8C':type==='Medical'?'#16A34A':type==='Emergency'?'#DC2626':'#7C3AED'} height={4}/>
          </div>
        ))}
      </div>
      {step==='apply'&&(
        <div style={{background:'var(--surface)',border:'1px solid rgba(27,61,140,0.25)',borderRadius:14,padding:'24px'}}>
          <div style={{color:'var(--text1)',fontWeight:700,fontSize:16,marginBottom:18}}>New Leave Application</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <label style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6}}>Leave Type</label>
              <select value={leaveType} onChange={e=>setLeaveType(e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}>
                {Object.keys(balance).map(t=><option key={t} value={t}>{t} Leave ({balance[t]} days remaining)</option>)}
              </select>
            </div>
            <div>
              <label style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6}}>Cover Teacher</label>
              <select style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}>
                <option>Mr. James Wilson</option><option>Ms. Phuong Nguyen</option><option>Mr. Minh Hoang</option>
              </select>
            </div>
            <div>
              <label style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6}}>From Date</label>
              <input type="date" defaultValue="2026-06-20" style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
            </div>
            <div>
              <label style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6}}>To Date</label>
              <input type="date" defaultValue="2026-06-22" style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <label style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:6}}>Reason</label>
              <textarea rows={3} placeholder="Provide a reason for your leave request..." style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none',resize:'vertical'}}/>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:16}}>
            <HEBtn variant="primary" icon="check" onClick={()=>setStep('list')}>Submit Application</HEBtn>
            <HEBtn variant="ghost" onClick={()=>setStep('list')}>Cancel</HEBtn>
          </div>
        </div>
      )}
      <div>
        <HESectionLabel>Leave History</HESectionLabel>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'var(--surface2)'}}>
                {['Type','Period','Days','Reason','Status'].map(h=><th key={h} style={{padding:'10px 16px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {history.map((r,i)=>(
                <tr key={i} style={{borderBottom:'1px solid var(--border)',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'11px 16px'}}><HEBadge variant={r.type==='Annual'?'blue':r.type==='Medical'?'green':r.type==='Emergency'?'red':'purple'}>{r.type}</HEBadge></td>
                  <td style={{padding:'11px 16px',color:'var(--text2)',fontSize:13}}>{r.from} – {r.to}</td>
                  <td style={{padding:'11px 16px',color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:15}}>{r.days}</td>
                  <td style={{padding:'11px 16px',color:'var(--text2)',fontSize:13}}>{r.reason}</td>
                  <td style={{padding:'11px 16px'}}><HEBadge variant={r.status}>{r.status.charAt(0).toUpperCase()+r.status.slice(1)}</HEBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TeacherStudentProgress = ({ d }) => {
  const [cls,setCls]=useState('EAP301');
  const students=TCH_STUDENTS[cls]||[];
  const avg=s=>Math.round(s.ass1*0.3+s.ass2*0.3+s.final*0.4);
  const atRisk=students.filter(s=>avg(s)<65);
  const passing=students.filter(s=>avg(s)>=65);
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Student Progress</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Track academic performance by class</div></div>
      <div style={{display:'flex',gap:8}}>
        {Object.keys(TCH_STUDENTS).map(c=>(
          <button key={c} onClick={()=>setCls(c)} style={{padding:'8px 16px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,border:'none',transition:'all 150ms',
            background:cls===c?'#1B3D8C':'var(--surface)',border:cls===c?'1px solid rgba(27,61,140,0.5)':'1px solid var(--border)',color:cls===c?'#fff':'var(--text2)'}}>
            {c}
          </button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[{l:'Students',v:students.length,c:'#1B3D8C'},{l:'Passing',v:passing.length,c:'#16A34A'},{l:'At Risk',v:atRisk.length,c:'#DC2626'},{l:'Class Avg',v:Math.round(students.reduce((a,s)=>a+avg(s),0)/students.length)+'%',c:'#F59E0B'}].map(s=>(
          <div key={s.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px',textAlign:'center',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:s.c,borderRadius:'10px 0 0 10px'}}/>
            <div style={{color:s.c==='#1B3D8C'?'#93B4FF':s.c==='#16A34A'?'#86EFAC':s.c==='#DC2626'?'#FCA5A5':'#FCD34D',fontFamily:'Oswald',fontWeight:800,fontSize:26}}>{s.v}</div>
            <div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
      {atRisk.length>0&&(
        <div style={{background:'rgba(220,38,38,0.07)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:12,padding:'16px 20px'}}>
          <div style={{color:'#FCA5A5',fontWeight:700,fontSize:14,marginBottom:10}}>⚠ At-Risk Students — Below 65%</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {atRisk.map((s,i)=>(
              <div key={i} style={{background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:8,padding:'8px 12px',display:'flex',alignItems:'center',gap:8}}>
                <HEAvatar name={s.name} size={24} color="#DC2626"/>
                <div><div style={{color:'var(--text1)',fontSize:12,fontWeight:600}}>{s.name}</div><div style={{color:'#FCA5A5',fontSize:11}}>{avg(s)}% overall</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <HESectionLabel>All Students — {cls}</HESectionLabel>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'var(--surface2)'}}>
              {['Student','Ass 1','Ass 2','Final','Overall','Grade','Status'].map(h=><th key={h} style={{padding:'10px 14px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {students.map((s,i)=>{
                const ov=avg(s);const {g,c}=GRADE_TABLE(ov);
                return (
                  <tr key={i} style={{borderBottom:'1px solid var(--border)',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 14px'}}><div style={{display:'flex',alignItems:'center',gap:9}}><HEAvatar name={s.name} size={26}/><span style={{color:'var(--text1)',fontSize:13,fontWeight:500}}>{s.name}</span></div></td>
                    <td style={{padding:'10px 14px',color:'var(--text2)',fontSize:13}}>{s.ass1}</td>
                    <td style={{padding:'10px 14px',color:'var(--text2)',fontSize:13}}>{s.ass2}</td>
                    <td style={{padding:'10px 14px',color:'var(--text2)',fontSize:13}}>{s.final}</td>
                    <td style={{padding:'10px 14px'}}><div style={{display:'flex',alignItems:'center',gap:8,minWidth:90}}><HEProgress value={ov} color={c} height={4}/><span style={{color:'var(--text1)',fontSize:12,fontWeight:600,flexShrink:0}}>{ov}%</span></div></td>
                    <td style={{padding:'10px 14px',textAlign:'left'}}><span style={{color:c,fontFamily:'Oswald',fontWeight:800,fontSize:18}}>{g}</span></td>
                    <td style={{padding:'10px 14px'}}><HEBadge variant={ov>=65?'active':'red'}>{ov>=65?'Passing':'At Risk'}</HEBadge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TeacherProfilePage = ({ d }) => {
  const [edit,setEdit]=useState(false);
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>My Profile</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>{d.dept}</div></div>
        <HEBtn variant={edit?'primary':'secondary'} icon={edit?'check':'settings'} onClick={()=>setEdit(e=>!e)}>{edit?'Save':'Edit Profile'}</HEBtn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:22}}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'22px',textAlign:'center'}}>
            <div style={{display:'flex',justifyContent:'center',marginBottom:12}}><HEAvatar name={d.name} size={80} color="#1B3D8C"/></div>
            <div style={{color:'var(--text1)',fontWeight:700,fontSize:17}}>{d.name}</div>
            <div style={{color:'var(--text3)',fontFamily:'monospace',fontSize:12,marginTop:3}}>{d.id}</div>
            <div style={{marginTop:10}}><HEBadge variant="blue" dot>Senior Lecturer</HEBadge></div>
          </div>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'18px'}}>
            <HESectionLabel>KPI Summary</HESectionLabel>
            <div style={{textAlign:'center',padding:'12px 0'}}><div style={{color:window.gradeColor(d.grade),fontFamily:'Oswald',fontWeight:800,fontSize:40,lineHeight:1}}>{d.kpi}</div><div style={{color:window.gradeColor(d.grade),fontWeight:700,fontSize:14,marginTop:4}}>Grade {d.grade}</div></div>
            <HEProgress value={d.kpi} color={window.gradeColor(d.grade)} height={6}/>
          </div>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'22px'}}>
          <HESectionLabel>Staff Information</HESectionLabel>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[{l:'Full Name',v:d.name},{l:'Staff ID',v:d.id,ro:true},{l:'Email',v:'linh.tran@happy.edu.vn'},{l:'Phone',v:'+84 909 876 543'},{l:'Department',v:d.dept},{l:'Employment',v:'Full-Time'},{l:'Joined',v:'Jan 2020'},{l:'Qualifications',v:'M.A. TESOL'}].map((f,i)=>(
              <div key={i}>
                <label style={{color:'var(--text3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>{f.l}</label>
                <input defaultValue={f.v} readOnly={!edit||f.ro} style={{width:'100%',background:edit&&!f.ro?'var(--surface2)':'transparent',border:edit&&!f.ro?'1px solid var(--border)':'none',borderBottom:'1px solid var(--border)',borderRadius:edit&&!f.ro?7:0,padding:edit&&!f.ro?'7px 10px':'6px 0',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none',opacity:f.ro?0.5:1}}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:22,paddingTop:18,borderTop:'1px solid var(--border)'}}>
            <HESectionLabel>Bank & Payroll</HESectionLabel>
            <div style={{display:'flex',gap:10}}>
              <HEBtn variant="secondary" icon="finance" small>View Payslips</HEBtn>
              <HEBtn variant="secondary" icon="settings" small>Update Bank Info</HEBtn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TeacherMessagesPage = ({ d }) => {
  const threads=[
    {from:'Admin Office',role:'admin',unread:1,last:'Please submit your June monthly report.',time:'1h ago',msgs:[{from:'admin',text:'Please submit your June monthly report by June 15.',time:'09:00'}]},
    {from:'Dr. Bui Van Khanh',role:'management',unread:0,last:'Great KPI results this month!',time:'Yesterday',msgs:[{from:'admin',text:'Great KPI results — keep it up!',time:'14:00'},{from:'teacher',text:'Thank you, Dr. Bui!',time:'14:15'}]},
    {from:'Nguyen Van An',role:'student',unread:0,last:'Thank you for the feedback.',time:'2 days ago',msgs:[{from:'student',text:'Ms. Linh, could I get feedback on my essay?',time:'10:00'},{from:'teacher',text:'Of course — I\'ll review it today.',time:'10:30'},{from:'student',text:'Thank you for the feedback.',time:'17:00'}]},
  ];
  const [active,setActive]=useState(0);
  const [msg,setMsg]=useState('');
  const t=threads[active];
  const roleColor={admin:'#475569',management:'#7C3AED',student:'#1B3D8C'};
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:16,height:'calc(100vh - 130px)'}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Messages</div></div>
      <div style={{flex:1,display:'flex',gap:16,minHeight:0}}>
        <div style={{width:250,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
          <div style={{flex:1,overflowY:'auto'}}>
            {threads.map((th,i)=>(
              <div key={i} onClick={()=>setActive(i)} style={{padding:'13px 14px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:active===i?'rgba(27,61,140,0.1)':'transparent',transition:'background 150ms'}}>
                <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <HEAvatar name={th.from} size={32} color={roleColor[th.role]}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{color:'var(--text1)',fontWeight:600,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{th.from}</div>
                      {th.unread>0&&<div style={{width:14,height:14,borderRadius:'50%',background:'#DC2626',color:'#fff',fontSize:8,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{th.unread}</div>}
                    </div>
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
            <HEAvatar name={t.from} size={32} color={roleColor[t.role]}/><div style={{color:'var(--text1)',fontWeight:600,fontSize:14}}>{t.from}</div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'18px',display:'flex',flexDirection:'column',gap:10}}>
            {t.msgs.map((m,i)=>{
              const isMe=m.from==='teacher';
              return (
                <div key={i} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',gap:8}}>
                  {!isMe&&<HEAvatar name={t.from} size={26} color={roleColor[t.role]}/>}
                  <div style={{maxWidth:'68%'}}>
                    <div style={{background:isMe?'#1B3D8C':'var(--surface2)',borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px',padding:'9px 13px',color:isMe?'#fff':'var(--text1)',fontSize:13,lineHeight:1.55}}>{m.text}</div>
                    <div style={{color:'var(--text3)',fontSize:10,marginTop:3,textAlign:isMe?'right':'left'}}>{m.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
            <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type a reply..." onKeyDown={e=>e.key==='Enter'&&msg.trim()&&setMsg('')}
              style={{flex:1,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
            <HEBtn variant="primary" onClick={()=>msg.trim()&&setMsg('')} icon="check">Send</HEBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window,{TeacherGradeEntry,TeacherLeaveManagement,TeacherStudentProgress,TeacherProfilePage,TeacherMessagesPage});
