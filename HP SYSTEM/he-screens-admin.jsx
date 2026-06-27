// HE-SYSTEM — Admin Screens: Enrolment, Invoices, Staff, Reports, Partners
const { useState } = React;

const PROGRAMMES=['Diploma in English Language','IELTS Preparation','Business English','Cambridge Young Learners','Advanced English'];
const STAFF=[
  {name:'Ms. Linh Tran',id:'TCH-0042',dept:'English Language Studies',kpi:78.4,grade:'B',type:'Full-Time',joined:'Jan 2020'},
  {name:'Mr. James Wilson',id:'TCH-0031',dept:'English Language Studies',kpi:91.2,grade:'A',type:'Full-Time',joined:'Mar 2018'},
  {name:'Ms. Phuong Nguyen',id:'TCH-0055',dept:'IELTS & Cambridge',kpi:88.5,grade:'A-',type:'Full-Time',joined:'Aug 2019'},
  {name:'Mr. Minh Hoang',id:'TCH-0067',dept:'Business English',kpi:65.1,grade:'D',type:'Part-Time',joined:'Jan 2023'},
  {name:'Ms. Thu Ha Bui',id:'TCH-0073',dept:'Young Learners',kpi:82.3,grade:'B+',type:'Full-Time',joined:'Jun 2021'},
  {name:'Mr. Duc Anh Tran',id:'TCH-0081',dept:'IELTS & Cambridge',kpi:74.7,grade:'B-',type:'Part-Time',joined:'Sep 2022'},
  {name:'Ms. Kim Oanh Le',id:'TCH-0089',dept:'English Language Studies',kpi:86.0,grade:'A-',type:'Full-Time',joined:'Feb 2020'},
  {name:'Mr. Van Hung Pham',id:'TCH-0094',dept:'Business English',kpi:71.2,grade:'C+',type:'Part-Time',joined:'Mar 2023'},
];

const AdminEnrolmentForm = () => {
  const [step,setStep]=useState(0);
  const steps=['Personal Info','Academic','Documents','Review'];
  const [form,setForm]=useState({firstName:'',lastName:'',dob:'',nationality:'Vietnamese',ic:'',phone:'',email:'',programme:'',intake:'',mode:'hybrid',payment:'monthly',partner:''});
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>New Student Enrolment</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Register a new student into the system</div></div>
        <HEBtn icon="close" variant="ghost" small>Cancel</HEBtn>
      </div>
      {/* Steps */}
      <div style={{display:'flex',gap:0,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        {steps.map((s,i)=>(
          <div key={s} onClick={()=>setStep(i)} style={{flex:1,padding:'12px 8px',textAlign:'center',cursor:'pointer',transition:'all 150ms',
            background:step===i?'rgba(27,61,140,0.15)':'transparent',borderRight:i<3?'1px solid var(--border)':'none'}}>
            <div style={{width:22,height:22,borderRadius:'50%',margin:'0 auto 6px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,
              background:i<step?'#16A34A':i===step?'#1B3D8C':'var(--surface2)',color:i<=step?'#fff':'var(--text3)'}}>
              {i<step?'✓':i+1}
            </div>
            <div style={{color:step===i?'#93B4FF':'var(--text3)',fontSize:12,fontWeight:step===i?600:400}}>{s}</div>
          </div>
        ))}
      </div>
      {/* Step 0: Personal */}
      {step===0&&(
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'24px'}}>
          <HESectionLabel>Personal Information</HESectionLabel>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {[{l:'First Name',k:'firstName',ph:'e.g. Van An'},{l:'Last Name',k:'lastName',ph:'e.g. Nguyen'},{l:'Date of Birth',k:'dob',type:'date'},{l:'Nationality',k:'nationality',ph:'Vietnamese'},{l:'IC / Passport No.',k:'ic',ph:'B01234567'},{l:'Phone Number',k:'phone',ph:'+84 912 xxx xxx'},{l:'Email Address',k:'email',ph:'student@email.com',col:2}].map(f=>(
              <div key={f.k} style={{gridColumn:f.col?`span ${f.col}`:'auto'}}>
                <label style={{color:'var(--text3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>{f.l}</label>
                <input type={f.type||'text'} value={form[f.k]} onChange={e=>upd(f.k,e.target.value)} placeholder={f.ph}
                  style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
              </div>
            ))}
          </div>
          <div style={{marginTop:20,display:'flex',justifyContent:'flex-end'}}><HEBtn variant="primary" onClick={()=>setStep(1)}>Next: Academic →</HEBtn></div>
        </div>
      )}
      {/* Step 1: Academic */}
      {step===1&&(
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'24px'}}>
          <HESectionLabel>Academic Details</HESectionLabel>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{gridColumn:'span 2'}}>
              <label style={{color:'var(--text3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>Programme</label>
              <select value={form.programme} onChange={e=>upd('programme',e.target.value)} style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}>
                <option value="">— Select Programme —</option>
                {PROGRAMMES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {[{l:'Intake Month',k:'intake',ph:'e.g. Jan 2026'},{l:'Referring Partner',k:'partner',ph:'Partner ID or name'}].map(f=>(
              <div key={f.k}>
                <label style={{color:'var(--text3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>{f.l}</label>
                <input value={form[f.k]} onChange={e=>upd(f.k,e.target.value)} placeholder={f.ph} style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
              </div>
            ))}
            <div>
              <label style={{color:'var(--text3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:8}}>Class Mode</label>
              <div style={{display:'flex',gap:8}}>
                {['hybrid','campus','remote'].map(m=>(
                  <button key={m} onClick={()=>upd('mode',m)} style={{flex:1,padding:'8px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,transition:'all 150ms',
                    background:form.mode===m?'rgba(27,61,140,0.15)':'var(--surface2)',border:form.mode===m?'1px solid rgba(27,61,140,0.4)':'1px solid var(--border)',color:form.mode===m?'#93B4FF':'var(--text2)'}}>
                    {m.charAt(0).toUpperCase()+m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{color:'var(--text3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:8}}>Payment Plan</label>
              <div style={{display:'flex',gap:8}}>
                {['monthly','semester','full'].map(p=>(
                  <button key={p} onClick={()=>upd('payment',p)} style={{flex:1,padding:'8px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,transition:'all 150ms',
                    background:form.payment===p?'rgba(27,61,140,0.15)':'var(--surface2)',border:form.payment===p?'1px solid rgba(27,61,140,0.4)':'1px solid var(--border)',color:form.payment===p?'#93B4FF':'var(--text2)'}}>
                    {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{marginTop:20,display:'flex',justifyContent:'space-between'}}><HEBtn variant="ghost" onClick={()=>setStep(0)}>← Back</HEBtn><HEBtn variant="primary" onClick={()=>setStep(2)}>Next: Documents →</HEBtn></div>
        </div>
      )}
      {/* Step 2: Documents */}
      {step===2&&(
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'24px'}}>
          <HESectionLabel>Required Documents</HESectionLabel>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {[{l:'Passport Photo',sub:'JPG/PNG, max 2MB'},{l:'IC / Passport Copy',sub:'PDF/JPG, max 5MB'},{l:'Academic Transcript',sub:'PDF, max 5MB'},{l:'Proof of Payment',sub:'PDF/JPG, bank slip'}].map(d=>(
              <div key={d.l} style={{background:'var(--surface2)',border:'2px dashed var(--border)',borderRadius:10,padding:'20px',textAlign:'center',cursor:'pointer',transition:'all 150ms'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(27,61,140,0.4)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                <div style={{fontSize:28,marginBottom:8}}>📎</div>
                <div style={{color:'var(--text1)',fontWeight:600,fontSize:13}}>{d.l}</div>
                <div style={{color:'var(--text3)',fontSize:11,marginTop:3}}>{d.sub}</div>
                <div style={{color:'#93B4FF',fontSize:12,marginTop:8,fontWeight:600}}>Click to Upload</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:20,display:'flex',justifyContent:'space-between'}}><HEBtn variant="ghost" onClick={()=>setStep(1)}>← Back</HEBtn><HEBtn variant="primary" onClick={()=>setStep(3)}>Next: Review →</HEBtn></div>
        </div>
      )}
      {/* Step 3: Review */}
      {step===3&&(
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'24px'}}>
          <HESectionLabel>Review & Confirm</HESectionLabel>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
            {[['Name',form.firstName+' '+form.lastName||'—'],['Programme',form.programme||'—'],['Intake',form.intake||'—'],['Mode',form.mode],['Payment Plan',form.payment],['Phone',form.phone||'—'],['Email',form.email||'—'],['Partner',form.partner||'None']].map(([k,v])=>(
              <div key={k} style={{background:'var(--surface2)',borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'var(--text3)',fontSize:12}}>{k}</span>
                <span style={{color:'var(--text1)',fontSize:12,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:'rgba(22,163,74,0.07)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:10,padding:'12px 16px',marginBottom:20}}>
            <div style={{color:'#86EFAC',fontSize:13}}>✓ A student ID and login credentials will be automatically generated and emailed to the student upon confirmation.</div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}><HEBtn variant="ghost" onClick={()=>setStep(2)}>← Back</HEBtn><HEBtn variant="primary" icon="check">Confirm & Enrol Student</HEBtn></div>
        </div>
      )}
    </div>
  );
};

const AdminInvoicesPage = ({ d }) => {
  const [filter,setFilter]=useState('all');
  const all=[...d.invoices,
    {student:'Nguyen Lan Anh',amount:2400,due:'Jun 15',overdue:false,inv:'HE-2026-0235',status:'pending'},
    {student:'Tran Quoc Bao',amount:1800,due:'Jun 20',overdue:false,inv:'HE-2026-0236',status:'paid'},
    {student:'Le Minh Chau',amount:3200,due:'May 31',overdue:true,inv:'HE-2026-0237',status:'overdue'},
    {student:'Pham Duc Huy',amount:2000,due:'Jul 1',overdue:false,inv:'HE-2026-0238',status:'pending'},
  ].map(i=>({...i,status:i.status||(i.overdue?'overdue':'pending')}));
  const filtered=filter==='all'?all:all.filter(i=>i.status===filter);
  const totals={total:all.reduce((a,b)=>a+b.amount,0),outstanding:all.filter(i=>i.status!=='paid').reduce((a,b)=>a+b.amount,0),overdue:all.filter(i=>i.overdue).reduce((a,b)=>a+b.amount,0),paid:all.filter(i=>i.status==='paid').reduce((a,b)=>a+b.amount,0)};
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Fee Invoicing</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Manage student fee invoices and payments</div></div>
        <HEBtn icon="plus" variant="primary">Create Invoice</HEBtn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[{l:'Total Invoiced',v:totals.total,c:'#1B3D8C'},{l:'Outstanding',v:totals.outstanding,c:'#D97706'},{l:'Overdue',v:totals.overdue,c:'#DC2626'},{l:'Collected',v:totals.paid,c:'#16A34A'}].map(s=>(
          <HEStatCard key={s.l} icon="invoices" label={s.l} value={s.v} format="currency" accent={s.c}/>
        ))}
      </div>
      <div style={{display:'flex',gap:8}}>
        {['all','pending','overdue','paid'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 14px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:600,transition:'all 150ms',
            background:filter===f?'#1B3D8C':'var(--surface)',border:filter===f?'transparent':'1px solid var(--border)',color:filter===f?'#fff':'var(--text2)'}}>
            {f.charAt(0).toUpperCase()+f.slice(1)} {filter===f&&`(${filtered.length})`}
          </button>
        ))}
      </div>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'var(--surface2)'}}>
            {['Invoice','Student','Amount','Due Date','Status','Actions'].map(h=><th key={h} style={{padding:'10px 16px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((inv,i)=>(
              <tr key={i} style={{borderBottom:'1px solid var(--border)',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'11px 16px',color:'var(--text3)',fontFamily:'monospace',fontSize:11}}>{inv.inv}</td>
                <td style={{padding:'11px 16px'}}><div style={{display:'flex',alignItems:'center',gap:9}}><HEAvatar name={inv.student} size={26}/><span style={{color:'var(--text1)',fontSize:13,fontWeight:500}}>{inv.student}</span></div></td>
                <td style={{padding:'11px 16px',color:inv.status==='overdue'?'#FCA5A5':'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:15}}>RM {inv.amount.toLocaleString()}</td>
                <td style={{padding:'11px 16px',color:'var(--text2)',fontSize:13}}>{inv.due}</td>
                <td style={{padding:'11px 16px'}}><HEBadge variant={inv.status}>{inv.status.charAt(0).toUpperCase()+inv.status.slice(1)}</HEBadge></td>
                <td style={{padding:'11px 16px'}}><div style={{display:'flex',gap:6}}>
                  {inv.status!=='paid'&&<HEBtn variant="primary" small>Mark Paid</HEBtn>}
                  {inv.status!=='paid'&&<HEBtn variant="secondary" small>Remind</HEBtn>}
                  {inv.status==='paid'&&<HEBtn variant="ghost" small icon="download">Receipt</HEBtn>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminStaffPage = () => {
  const [search,setSearch]=useState('');
  const filtered=STAFF.filter(s=>s.name.toLowerCase().includes(search.toLowerCase())||s.dept.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Staff Directory</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>{STAFF.length} staff members</div></div>
        <HEBtn icon="enrolment" variant="primary">Add Staff Member</HEBtn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[{l:'Total Staff',v:STAFF.length,c:'#1B3D8C'},{l:'Full-Time',v:STAFF.filter(s=>s.type==='Full-Time').length,c:'#16A34A'},{l:'Part-Time',v:STAFF.filter(s=>s.type==='Part-Time').length,c:'#F59E0B'},{l:'Avg KPI',v:Math.round(STAFF.reduce((a,b)=>a+b.kpi,0)/STAFF.length)+'%',c:'#7C3AED'}].map(s=>(
          <div key={s.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:s.c}}/>
            <div style={{color:s.c==='#1B3D8C'?'#93B4FF':s.c==='#16A34A'?'#86EFAC':s.c==='#F59E0B'?'#FCD34D':'#C4B5FD',fontFamily:'Oswald',fontWeight:800,fontSize:24}}>{s.v}</div>
            <div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{background:'var(--surface2)',borderRadius:8,padding:'8px 14px',display:'flex',alignItems:'center',gap:8,color:'var(--text3)',maxWidth:320}}>
        <HEIcon name="search" size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or department..." style={{background:'none',border:'none',outline:'none',color:'var(--text2)',fontSize:13,fontFamily:'inherit',width:'100%'}}/>
      </div>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'var(--surface2)'}}>
            {['Staff Member','ID','Department','KPI Score','Employment','Joined','Action'].map(h=><th key={h} style={{padding:'10px 16px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((s,i)=>(
              <tr key={i} style={{borderBottom:'1px solid var(--border)',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'10px 16px'}}><div style={{display:'flex',alignItems:'center',gap:10}}><HEAvatar name={s.name} size={30}/><span style={{color:'var(--text1)',fontSize:13,fontWeight:600}}>{s.name}</span></div></td>
                <td style={{padding:'10px 16px',color:'var(--text3)',fontFamily:'monospace',fontSize:11}}>{s.id}</td>
                <td style={{padding:'10px 16px',color:'var(--text2)',fontSize:13}}>{s.dept}</td>
                <td style={{padding:'10px 16px',minWidth:140}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{flex:1}}><HEProgress value={s.kpi} color={window.gradeColor(s.grade)} height={5}/></div>
                    <span style={{color:window.gradeColor(s.grade),fontFamily:'Oswald',fontWeight:700,fontSize:14,flexShrink:0}}>{s.grade}</span>
                  </div>
                </td>
                <td style={{padding:'10px 16px'}}><HEBadge variant={s.type==='Full-Time'?'blue':'gold'}>{s.type}</HEBadge></td>
                <td style={{padding:'10px 16px',color:'var(--text3)',fontSize:12}}>{s.joined}</td>
                <td style={{padding:'10px 16px'}}><HEBtn variant="secondary" small icon="eye">View</HEBtn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminReportsPage = () => {
  const [active,setActive]=useState('attendance');
  const reports=[
    {id:'attendance',icon:'attendance',label:'Attendance Report',sub:'Daily / weekly / monthly attendance by class and student',color:'#1B3D8C'},
    {id:'academic',icon:'grades',label:'Academic Performance',sub:'Grade distribution, GPA trends, at-risk students',color:'#16A34A'},
    {id:'financial',icon:'finance',label:'Financial Summary',sub:'Fee collection, outstanding balances, revenue',color:'#D97706'},
    {id:'enrolment',icon:'enrolment',label:'Enrolment Report',sub:'New registrations, programme breakdown, intake stats',color:'#7C3AED'},
    {id:'kpi',icon:'kpi',label:'KPI Report — Staff',sub:'Teacher KPI scores, grade distribution, trends',color:'#0EA5E9'},
    {id:'partner',icon:'partners',label:'Partner Report',sub:'Referral performance, commission summary',color:'#DC2626'},
  ];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Reports & Export Centre</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Generate and download institutional reports</div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        {reports.map(r=>(
          <div key={r.id} onClick={()=>setActive(r.id)} style={{background:active===r.id?r.color+'18':'var(--surface)',border:`1px solid ${active===r.id?r.color+'40':'var(--border)'}`,borderRadius:12,padding:'16px 18px',cursor:'pointer',transition:'all 200ms'}}>
            <div style={{width:36,height:36,borderRadius:8,background:r.color+'18',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10}}>
              <HEIcon name={r.icon} size={18} color={r.color==='#1B3D8C'?'#93B4FF':r.color==='#16A34A'?'#86EFAC':r.color==='#D97706'?'#FCD34D':r.color==='#7C3AED'?'#C4B5FD':r.color==='#0EA5E9'?'#7DD3FC':'#FCA5A5'}/>
            </div>
            <div style={{color:'var(--text1)',fontWeight:600,fontSize:14}}>{r.label}</div>
            <div style={{color:'var(--text3)',fontSize:12,marginTop:4,lineHeight:1.4}}>{r.sub}</div>
          </div>
        ))}
      </div>
      {active&&(
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'24px'}}>
          <div style={{color:'var(--text1)',fontWeight:700,fontSize:15,marginBottom:16}}>{reports.find(r=>r.id===active)?.label} — Configuration</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:20}}>
            <div>
              <label style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>Date From</label>
              <input type="date" defaultValue="2026-06-01" style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
            </div>
            <div>
              <label style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>Date To</label>
              <input type="date" defaultValue="2026-06-30" style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
            </div>
            <div>
              <label style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>Group By</label>
              <select style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}>
                <option>All Students</option><option>By Programme</option><option>By Class</option><option>By Teacher</option>
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <HEBtn variant="primary" icon="download">Export as PDF</HEBtn>
            <HEBtn variant="secondary" icon="download">Export as CSV</HEBtn>
            <HEBtn variant="secondary" icon="download">Export as Excel</HEBtn>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminPartnersPage = () => {
  const partners=[
    {name:'Pham Van Cuong',id:'PTR-0201',students:72,tier:'platinum',commission:126000,status:'active'},
    {name:'Le Thi Hong',id:'PTR-0185',students:55,tier:'gold',commission:98000,status:'active'},
    {name:'Nguyen Hoang Phuc',id:'PTR-0312',students:38,tier:'gold',commission:87400,status:'active'},
    {name:'Tran Quoc Anh',id:'PTR-0267',students:29,tier:'silver',commission:52000,status:'active'},
    {name:'Bui Van Minh',id:'PTR-0341',students:21,tier:'silver',commission:37800,status:'active'},
    {name:'Vo Thi Lan',id:'PTR-0389',students:8,tier:'bronze',commission:14000,status:'inactive'},
  ];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Partner Management</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>{partners.length} registered partners</div></div>
        <HEBtn icon="enrolment" variant="primary">Add Partner</HEBtn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[{l:'Active Partners',v:partners.filter(p=>p.status==='active').length,c:'#1B3D8C'},{l:'Students via Partners',v:partners.reduce((a,b)=>a+b.students,0),c:'#16A34A'},{l:'Total Commission',v:'RM '+Math.round(partners.reduce((a,b)=>a+b.commission,0)/1000)+'K',c:'#D97706'},{l:'Platinum Partners',v:partners.filter(p=>p.tier==='platinum').length,c:'#A78BFA'}].map(s=>(
          <div key={s.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:s.c}}/>
            <div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:800,fontSize:22}}>{s.v}</div>
            <div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'var(--surface2)'}}>
            {['Partner','ID','Students','Tier','Commission Earned','Status','Actions'].map(h=><th key={h} style={{padding:'10px 16px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {partners.map((p,i)=>(
              <tr key={i} style={{borderBottom:'1px solid var(--border)',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'11px 16px'}}><div style={{display:'flex',alignItems:'center',gap:10}}><HEAvatar name={p.name} size={28}/><span style={{color:'var(--text1)',fontSize:13,fontWeight:500}}>{p.name}</span></div></td>
                <td style={{padding:'11px 16px',color:'var(--text3)',fontFamily:'monospace',fontSize:11}}>{p.id}</td>
                <td style={{padding:'11px 16px',color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:15}}>{p.students}</td>
                <td style={{padding:'11px 16px'}}><HETier tier={p.tier}/></td>
                <td style={{padding:'11px 16px',color:'#FCD34D',fontFamily:'Oswald',fontWeight:700,fontSize:15}}>RM {p.commission.toLocaleString()}</td>
                <td style={{padding:'11px 16px'}}><HEBadge variant={p.status}>{p.status.charAt(0).toUpperCase()+p.status.slice(1)}</HEBadge></td>
                <td style={{padding:'11px 16px'}}><HEBtn variant="secondary" small icon="eye">View</HEBtn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

Object.assign(window,{AdminEnrolmentForm,AdminInvoicesPage,AdminStaffPage,AdminReportsPage,AdminPartnersPage});
