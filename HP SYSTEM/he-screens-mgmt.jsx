// HE-SYSTEM — Management Screens + Partner/Parent extra screens
const { useState } = React;

const ALL_TEACHERS = [
  {name:'James Wilson',id:'TCH-0031',dept:'English',kpi:91.2,grade:'A',type:'FT',trend:'up'},
  {name:'Phuong Nguyen',id:'TCH-0055',dept:'IELTS',kpi:88.5,grade:'A-',type:'FT',trend:'up'},
  {name:'Kim Oanh Le',id:'TCH-0089',dept:'English',kpi:86.0,grade:'A-',type:'FT',trend:'neutral'},
  {name:'Thu Ha Bui',id:'TCH-0073',dept:'Young Learners',kpi:82.3,grade:'B+',type:'FT',trend:'up'},
  {name:'Linh Tran',id:'TCH-0042',dept:'English',kpi:78.4,grade:'B',type:'FT',trend:'neutral'},
  {name:'Duc Anh Tran',id:'TCH-0081',dept:'IELTS',kpi:74.7,grade:'B-',type:'PT',trend:'down'},
  {name:'Van Hung Pham',id:'TCH-0094',dept:'Business',kpi:71.2,grade:'C+',type:'PT',trend:'neutral'},
  {name:'Minh Hoang',id:'TCH-0067',dept:'Business',kpi:65.1,grade:'D',type:'PT',trend:'down'},
];

const MgmtKPIAll = ({ d }) => {
  const [filter,setFilter]=useState('all');
  const [sort,setSort]=useState('kpi');
  const filtered=[...ALL_TEACHERS]
    .filter(t=>filter==='all'||t.grade.startsWith(filter))
    .sort((a,b)=>sort==='kpi'?b.kpi-a.kpi:a.name.localeCompare(b.name));
  const dist={A:ALL_TEACHERS.filter(t=>t.grade.startsWith('A')).length,B:ALL_TEACHERS.filter(t=>t.grade.startsWith('B')).length,C:ALL_TEACHERS.filter(t=>t.grade.startsWith('C')).length,D:ALL_TEACHERS.filter(t=>t.grade==='D').length};
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>KPI Overview — All Staff</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>June 2026 · {ALL_TEACHERS.length} staff members evaluated</div></div>
        <HEBtn icon="download" variant="secondary">Export Report</HEBtn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
        {[{l:'Average KPI',v:Math.round(ALL_TEACHERS.reduce((a,b)=>a+b.kpi,0)/ALL_TEACHERS.length)+'%',c:'#1B3D8C'},{l:'Grade A',v:dist.A,c:'#16A34A'},{l:'Grade B',v:dist.B,c:'#3B82F6'},{l:'Grade C',v:dist.C,c:'#D97706'},{l:'Grade D/F',v:dist.D,c:'#DC2626'}].map(s=>(
          <div key={s.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px',textAlign:'center',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:s.c}}/>
            <div style={{color:s.c==='#1B3D8C'?'#93B4FF':s.c==='#16A34A'?'#86EFAC':s.c==='#3B82F6'?'#93C5FD':s.c==='#D97706'?'#FCD34D':'#FCA5A5',fontFamily:'Oswald',fontWeight:800,fontSize:26,paddingTop:6}}>{s.v}</div>
            <div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <span style={{color:'var(--text3)',fontSize:12,marginRight:4}}>Filter:</span>
        {['all','A','B','C','D'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'5px 12px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,transition:'all 150ms',
            background:filter===f?'#1B3D8C':'var(--surface)',border:filter===f?'transparent':'1px solid var(--border)',color:filter===f?'#fff':'var(--text2)'}}>
            {f==='all'?'All':f==='D'?'D/F':'Grade '+f}
          </button>
        ))}
        <span style={{color:'var(--text3)',fontSize:12,marginLeft:12,marginRight:4}}>Sort:</span>
        {['kpi','name'].map(s=>(
          <button key={s} onClick={()=>setSort(s)} style={{padding:'5px 12px',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:600,transition:'all 150ms',
            background:sort===s?'rgba(27,61,140,0.15)':'transparent',border:'1px solid var(--border)',color:sort===s?'#93B4FF':'var(--text2)'}}>
            {s==='kpi'?'KPI Score':'Name'}
          </button>
        ))}
      </div>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'var(--surface2)'}}>
            {['Rank','Staff Member','Dept','KPI Score','Grade','Type','Trend','Action'].map(h=><th key={h} style={{padding:'10px 16px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((t,i)=>(
              <tr key={i} style={{borderBottom:'1px solid var(--border)',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'10px 16px',color:'var(--text3)',fontFamily:'Oswald',fontWeight:700,fontSize:14}}>{i+1}</td>
                <td style={{padding:'10px 16px'}}><div style={{display:'flex',alignItems:'center',gap:9}}><HEAvatar name={t.name} size={28}/><div><div style={{color:'var(--text1)',fontSize:13,fontWeight:600}}>{t.name}</div><div style={{color:'var(--text3)',fontFamily:'monospace',fontSize:10}}>{t.id}</div></div></div></td>
                <td style={{padding:'10px 16px',color:'var(--text2)',fontSize:13}}>{t.dept}</td>
                <td style={{padding:'10px 16px',minWidth:160}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{flex:1}}><HEProgress value={t.kpi} color={window.gradeColor(t.grade)} height={5}/></div>
                    <span style={{color:'var(--text2)',fontSize:12,flexShrink:0}}>{t.kpi}</span>
                  </div>
                </td>
                <td style={{padding:'10px 16px'}}><span style={{color:window.gradeColor(t.grade),fontFamily:'Oswald',fontWeight:800,fontSize:20}}>{t.grade}</span></td>
                <td style={{padding:'10px 16px'}}><HEBadge variant={t.type==='FT'?'blue':'gold'}>{t.type==='FT'?'Full-Time':'Part-Time'}</HEBadge></td>
                <td style={{padding:'10px 16px',fontSize:16}}>{t.trend==='up'?'↑':t.trend==='down'?'↓':'→'}</td>
                <td style={{padding:'10px 16px'}}><HEBtn variant="secondary" small icon="eye">KPI Detail</HEBtn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MgmtFinancePage = ({ d }) => {
  const revenue=[{cat:'Tuition Fees',amount:1024600,pct:79.8},{cat:'Registration Fees',amount:124400,pct:9.7},{cat:'Materials & Lab',amount:68200,pct:5.3},{cat:'Events & Other',amount:67400,pct:5.2}];
  const expenses=[{cat:'Staff Salaries',amount:620000,pct:62.4},{cat:'Partner Commissions',amount:52300,pct:5.3},{cat:'Facility & Ops',amount:187400,pct:18.9},{cat:'Marketing',amount:73800,pct:7.4},{cat:'IT & Systems',amount:49000,pct:4.9}];
  const totalRev=revenue.reduce((a,b)=>a+b.amount,0);
  const totalExp=expenses.reduce((a,b)=>a+b.amount,0);
  const netProfit=totalRev-totalExp;
  const margin=Math.round((netProfit/totalRev)*100);
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Financial Dashboard</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>June 2026 P&L Summary</div></div>
        <HEBtn icon="download" variant="secondary">Export P&L</HEBtn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
        {[{l:'Total Revenue',v:totalRev,c:'#16A34A',f:'currency'},{l:'Total Expenses',v:totalExp,c:'#DC2626',f:'currency'},{l:'Net Profit',v:netProfit,c:'#1B3D8C',f:'currency'},{l:'Profit Margin',v:margin+'%',c:'#F59E0B',f:'string'}].map(s=>(
          <div key={s.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 18px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,background:s.c}}/>
            <div style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>{s.l}</div>
            <div style={{color:s.c==='#16A34A'?'#86EFAC':s.c==='#DC2626'?'#FCA5A5':s.c==='#1B3D8C'?'#93B4FF':'#FCD34D',fontFamily:'Oswald',fontWeight:800,fontSize:24}}>
              {s.f==='currency'?`RM ${Math.round(s.v/1000)}K`:s.v}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div>
          <HESectionLabel>Revenue Breakdown</HESectionLabel>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
            {revenue.map((r,i)=>(
              <div key={i} style={{padding:'14px 18px',borderBottom:i<revenue.length-1?'1px solid var(--border)':'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{color:'var(--text1)',fontSize:13,fontWeight:500}}>{r.cat}</span>
                  <span style={{color:'#86EFAC',fontFamily:'Oswald',fontWeight:700,fontSize:14}}>RM {Math.round(r.amount/1000)}K</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{flex:1}}><HEProgress value={r.pct} color="#16A34A"/></div>
                  <span style={{color:'var(--text3)',fontSize:11,flexShrink:0}}>{r.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <HESectionLabel>Expense Breakdown</HESectionLabel>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
            {expenses.map((e,i)=>(
              <div key={i} style={{padding:'14px 18px',borderBottom:i<expenses.length-1?'1px solid var(--border)':'none'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{color:'var(--text1)',fontSize:13,fontWeight:500}}>{e.cat}</span>
                  <span style={{color:'#FCA5A5',fontFamily:'Oswald',fontWeight:700,fontSize:14}}>RM {Math.round(e.amount/1000)}K</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{flex:1}}><HEProgress value={e.pct} color="#DC2626"/></div>
                  <span style={{color:'var(--text3)',fontSize:11,flexShrink:0}}>{e.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        <HESectionLabel>Monthly Revenue Trend — 2026</HESectionLabel>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'20px 20px 12px'}}>
          <HEBarChart data={d.chart} labels={d.chartLabels} color="#16A34A" height={130}/>
        </div>
      </div>
    </div>
  );
};

const MgmtAnalyticsPage = ({ d }) => {
  const atRisk=[
    {name:'Nguyen Duc Anh',id:'APD21110067',att:58,gpa:1.8,prog:'Diploma English',risk:'high'},
    {name:'Pham Van Long',id:'APD22010034',att:63,gpa:2.1,prog:'IELTS Prep',risk:'high'},
    {name:'Le Thi Mai',id:'APD23060012',att:71,gpa:2.4,prog:'Business English',risk:'medium'},
    {name:'Bui Duc Thanh',id:'APD22090056',att:73,gpa:2.6,prog:'Diploma English',risk:'medium'},
    {name:'Tran Minh Tuan',id:'APD24010007',att:75,gpa:2.8,prog:'Cambridge YL',risk:'low'},
  ];
  const retention=[{month:'Jan',rate:94},{month:'Feb',rate:96},{month:'Mar',rate:92},{month:'Apr',rate:95},{month:'May',rate:97},{month:'Jun',rate:91}];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Student Analytics</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Retention, at-risk tracking, and enrolment trends</div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        {[{l:'Active Students',v:d.students,c:'#1B3D8C'},{l:'Retention Rate',v:'93%',c:'#16A34A'},{l:'At-Risk (High)',v:atRisk.filter(s=>s.risk==='high').length,c:'#DC2626'},{l:'Graduating Jun 26',v:87,c:'#F59E0B'}].map(s=>(
          <HEStatCard key={s.l} icon="students" label={s.l} value={typeof s.v==='number'?s.v:s.v.replace('%','')} format={typeof s.v==='string'&&s.v.includes('%')?'percent':'number'} accent={s.c}/>
        ))}
      </div>
      <div style={{background:'rgba(220,38,38,0.07)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:14,padding:'20px 22px'}}>
        <div style={{color:'#FCA5A5',fontWeight:700,fontSize:15,marginBottom:16}}>⚠ At-Risk Students — Immediate Attention Required</div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'var(--surface2)'}}>
              {['Student','Programme','Attendance','GPA','Risk Level','Action'].map(h=><th key={h} style={{padding:'9px 16px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {atRisk.map((s,i)=>(
                <tr key={i} style={{borderBottom:i<atRisk.length-1?'1px solid var(--border)':'none',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'10px 16px'}}><div style={{display:'flex',alignItems:'center',gap:9}}><HEAvatar name={s.name} size={26}/><div><div style={{color:'var(--text1)',fontSize:13,fontWeight:500}}>{s.name}</div><div style={{color:'var(--text3)',fontFamily:'monospace',fontSize:10}}>{s.id}</div></div></div></td>
                  <td style={{padding:'10px 16px',color:'var(--text2)',fontSize:12}}>{s.prog}</td>
                  <td style={{padding:'10px 16px'}}><span style={{color:s.att<65?'#FCA5A5':s.att<75?'#FCD34D':'#86EFAC',fontFamily:'Oswald',fontWeight:700,fontSize:15}}>{s.att}%</span></td>
                  <td style={{padding:'10px 16px'}}><span style={{color:s.gpa<2?'#FCA5A5':s.gpa<2.5?'#FCD34D':'#86EFAC',fontFamily:'Oswald',fontWeight:700,fontSize:15}}>{s.gpa}</span></td>
                  <td style={{padding:'10px 16px'}}><HEBadge variant={s.risk==='high'?'red':s.risk==='medium'?'gold':'blue'}>{s.risk.charAt(0).toUpperCase()+s.risk.slice(1)}</HEBadge></td>
                  <td style={{padding:'10px 16px'}}><HEBtn variant="danger" small>Intervene</HEBtn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div>
          <HESectionLabel>Retention Rate Trend</HESectionLabel>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'18px 20px 10px'}}>
            <HEBarChart data={retention.map(r=>r.rate)} labels={retention.map(r=>r.month)} color="#1B3D8C" height={110}/>
          </div>
        </div>
        <div>
          <HESectionLabel>Enrolment by Programme</HESectionLabel>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'16px'}}>
            {[{l:'Diploma English',v:487,c:'#1B3D8C'},{l:'IELTS Preparation',v:312,c:'#16A34A'},{l:'Business English',v:228,c:'#D97706'},{l:'Cambridge YL',v:145,c:'#7C3AED'},{l:'Advanced English',v:75,c:'#0EA5E9'}].map((p,i,arr)=>(
              <div key={p.l} style={{marginBottom:i<arr.length-1?14:0}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{color:'var(--text1)',fontSize:13}}>{p.l}</span>
                  <span style={{color:'var(--text2)',fontFamily:'Oswald',fontWeight:700,fontSize:14}}>{p.v}</span>
                </div>
                <HEProgress value={(p.v/487)*100} color={p.c} height={5}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const MgmtPartnerReport = ({ d }) => {
  const partners=[
    {name:'Pham Van Cuong',students:72,tier:'platinum',earned:126000,rate:35,trend:'up'},
    {name:'Le Thi Hong',students:55,tier:'gold',earned:98000,rate:30,trend:'up'},
    {name:'Nguyen Hoang Phuc',students:38,tier:'gold',earned:87400,rate:23.2,trend:'neutral'},
    {name:'Tran Quoc Anh',students:29,tier:'silver',earned:52000,rate:19.6,trend:'down'},
    {name:'Bui Van Minh',students:21,tier:'silver',earned:37800,rate:16.4,trend:'neutral'},
  ];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Partner Performance</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Commission and referral analytics</div></div>
        <HEBtn icon="download" variant="secondary">Export Report</HEBtn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
        <HEStatCard icon="partners" label="Active Partners" value={5} accent="#1B3D8C"/>
        <HEStatCard icon="students" label="Students via Partners" value={215} accent="#16A34A" trend={8}/>
        <HEStatCard icon="commission" label="Total Commission" value={401200} format="currency" accent="#F59E0B"/>
        <HEStatCard icon="trending" label="Avg Commission Rate" value={24.8} format="percent" accent="#7C3AED"/>
      </div>
      <div>
        <HESectionLabel>Top Partners — June 2026</HESectionLabel>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          {partners.map((p,i)=>(
            <div key={i} style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:16,borderBottom:i<partners.length-1?'1px solid var(--border)':'none',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <div style={{width:30,height:30,borderRadius:'50%',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',color:i===0?'#FCD34D':i===1?'#94A3B8':i===2?'#CD7F32':'var(--text3)',fontSize:14,fontWeight:800,fontFamily:'Oswald',flexShrink:0}}>
                {i+1}
              </div>
              <HEAvatar name={p.name} size={34}/>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{color:'var(--text1)',fontWeight:600,fontSize:13}}>{p.name}</span><HETier tier={p.tier}/></div>
                <div style={{display:'flex',gap:20}}>
                  <span style={{color:'var(--text3)',fontSize:12}}>{p.students} students</span>
                  <span style={{color:'var(--text3)',fontSize:12}}>{p.rate}% commission rate</span>
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{color:'#FCD34D',fontFamily:'Oswald',fontWeight:700,fontSize:18}}>RM {p.earned.toLocaleString()}</div>
                <div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>total earned</div>
              </div>
              <div style={{fontSize:18,flexShrink:0}}>{p.trend==='up'?<span style={{color:'#86EFAC'}}>↑</span>:p.trend==='down'?<span style={{color:'#FCA5A5'}}>↓</span>:<span style={{color:'var(--text3)'}}>→</span>}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── PARTNER EXTRA SCREENS ────────────────────────────────────
const PartnerCommissionPage = ({ d }) => {
  const monthly=[
    {month:'Jan',students:28,commission:9856},{month:'Feb',students:31,commission:10882},{month:'Mar',students:34,commission:11948},{month:'Apr',students:36,commission:12640},
    {month:'May',students:37,commission:12992},{month:'Jun',students:38,commission:14200},
  ];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Commission Tracker</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Detailed commission breakdown and calculations</div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
        <HEStatCard icon="commission" label="Total Earned (YTD)" value={d.totalEarned} format="currency" accent="#F59E0B"/>
        <HEStatCard icon="finance" label="This Month" value={d.thisMonth} format="currency" accent="#16A34A" trend={9.3}/>
        <HEStatCard icon="star" label="Commission Rate" value={d.rate} format="percent" accent="#7C3AED"/>
      </div>
      <div style={{background:'var(--surface)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:14,padding:'20px 22px'}}>
        <div style={{color:'#FCD34D',fontWeight:700,fontSize:14,marginBottom:10}}>Commission Formula</div>
        <div style={{fontFamily:'JetBrains Mono, monospace',fontSize:13,color:'#93B4FF',background:'rgba(27,61,140,0.1)',borderRadius:8,padding:'12px 16px',marginBottom:12}}>
          Rate = min(35%, 8% + (students × 0.4%))
        </div>
        <div style={{display:'flex',gap:24}}>
          {[{label:'Your students',value:d.recruited},{label:'Your rate',value:d.rate+'%'},{label:'Base rate',value:'8%'},{label:'Bonus earned',value:(d.rate-8).toFixed(1)+'%'}].map(f=>(
            <div key={f.label} style={{textAlign:'center'}}>
              <div style={{color:'#FCD34D',fontFamily:'Oswald',fontWeight:700,fontSize:20}}>{f.value}</div>
              <div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <HESectionLabel>Monthly Earnings Breakdown</HESectionLabel>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'var(--surface2)'}}>
              {['Month','Students','Rate','Commission Earned'].map(h=><th key={h} style={{padding:'10px 16px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {monthly.map((m,i)=>(
                <tr key={i} style={{borderBottom:i<monthly.length-1?'1px solid var(--border)':'none',background:i===monthly.length-1?'rgba(245,158,11,0.05)':'transparent',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background=i===monthly.length-1?'rgba(245,158,11,0.05)':'transparent'}>
                  <td style={{padding:'11px 16px',color:'var(--text1)',fontWeight:i===monthly.length-1?700:400,fontSize:13}}>{m.month} 2026{i===monthly.length-1&&' (current)'}</td>
                  <td style={{padding:'11px 16px',color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:15}}>{m.students}</td>
                  <td style={{padding:'11px 16px',color:'var(--text2)',fontSize:13}}>{(8+m.students*0.4).toFixed(1)}%</td>
                  <td style={{padding:'11px 16px',color:'#FCD34D',fontFamily:'Oswald',fontWeight:700,fontSize:16}}>RM {m.commission.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PartnerPayoutsPage = ({ d }) => {
  const [showReq,setShowReq]=useState(false);
  const history=[
    {id:'PAY-2026-0045',amount:14200,month:'Jun 2026',status:'pending',requested:'Jun 7'},
    {id:'PAY-2026-0032',amount:12992,month:'May 2026',status:'paid',requested:'May 5',paid:'May 10'},
    {id:'PAY-2026-0021',amount:12640,month:'Apr 2026',status:'paid',requested:'Apr 3',paid:'Apr 9'},
    {id:'PAY-2026-0012',amount:11948,month:'Mar 2026',status:'paid',requested:'Mar 4',paid:'Mar 11'},
  ];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Payout History</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Track and request commission payouts</div></div>
        <HEBtn icon="payouts" variant="gold" onClick={()=>setShowReq(true)}>Request Payout</HEBtn>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        <HEStatCard icon="finance" label="Total Paid Out" value={d.totalEarned-d.pending} format="currency" accent="#16A34A"/>
        <HEStatCard icon="payouts" label="Pending Payout" value={d.pending} format="currency" accent="#F59E0B"/>
        <HEStatCard icon="star" label="Avg Processing Time" value="5 days" accent="#1B3D8C"/>
      </div>
      {showReq&&(
        <div style={{background:'var(--surface)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:14,padding:'22px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><div style={{color:'var(--text1)',fontWeight:700,fontSize:15}}>Request Payout — RM {d.pending.toLocaleString()}</div><button onClick={()=>setShowReq(false)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:18}}>×</button></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
            {[{l:'Bank Name',ph:'e.g. Maybank, BIDV, Vietcombank'},{l:'Account Number',ph:'Enter account number'},{l:'Account Holder',ph:'Name as on bank account'},{l:'Payment Reference',ph:'Optional'}].map(f=>(
              <div key={f.l}><label style={{color:'var(--text3)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',display:'block',marginBottom:5}}>{f.l}</label><input placeholder={f.ph} style={{width:'100%',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}/></div>
            ))}
          </div>
          <HEBtn variant="gold" icon="check" onClick={()=>setShowReq(false)}>Submit Payout Request — RM {d.pending.toLocaleString()}</HEBtn>
        </div>
      )}
      <div>
        <HESectionLabel>Payout Records</HESectionLabel>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'var(--surface2)'}}>
              {['Reference','Period','Amount','Status','Requested','Paid'].map(h=><th key={h} style={{padding:'10px 16px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {history.map((p,i)=>(
                <tr key={i} style={{borderBottom:i<history.length-1?'1px solid var(--border)':'none',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'11px 16px',color:'var(--text3)',fontFamily:'monospace',fontSize:11}}>{p.id}</td>
                  <td style={{padding:'11px 16px',color:'var(--text1)',fontSize:13,fontWeight:500}}>{p.month}</td>
                  <td style={{padding:'11px 16px',color:'#FCD34D',fontFamily:'Oswald',fontWeight:700,fontSize:15}}>RM {p.amount.toLocaleString()}</td>
                  <td style={{padding:'11px 16px'}}><HEBadge variant={p.status}>{p.status.charAt(0).toUpperCase()+p.status.slice(1)}</HEBadge></td>
                  <td style={{padding:'11px 16px',color:'var(--text2)',fontSize:12}}>{p.requested}</td>
                  <td style={{padding:'11px 16px',color:'var(--text3)',fontSize:12}}>{p.paid||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PartnerStudentsPage = ({ d }) => {
  const all=[
    ...d.students,
    {name:'Nguyen Duc Anh',programme:'Cambridge YL',status:'enrolled',comm:928,date:'Apr 2026'},
    {name:'Pham Thi Lan',programme:'Business English',status:'enrolled',comm:1160,date:'Mar 2026'},
    {name:'Le Van Tung',programme:'IELTS Prep',status:'enrolled',comm:1160,date:'Mar 2026'},
    {name:'Hoang Minh Thu',programme:'Diploma English',status:'pending',comm:0,date:'Jun 2026'},
  ];
  const totalComm=all.reduce((a,b)=>a+b.comm,0);
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>My Referred Students</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>{all.length} students referred · RM {totalComm.toLocaleString()} total commission</div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        <HEStatCard icon="students" label="Total Referred" value={all.length} accent="#1B3D8C"/>
        <HEStatCard icon="active" label="Enrolled" value={all.filter(s=>s.status==='enrolled').length} accent="#16A34A"/>
        <HEStatCard icon="commission" label="Commission Earned" value={totalComm} format="currency" accent="#F59E0B"/>
      </div>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'var(--surface2)'}}>
            {['Student','Programme','Status','Commission','Date Referred'].map(h=><th key={h} style={{padding:'10px 16px',color:'var(--text3)',fontSize:11,fontWeight:700,textAlign:'left',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {all.map((s,i)=>(
              <tr key={i} style={{borderBottom:i<all.length-1?'1px solid var(--border)':'none',transition:'background 150ms'}} onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'11px 16px'}}><div style={{display:'flex',alignItems:'center',gap:9}}><HEAvatar name={s.name} size={28}/><span style={{color:'var(--text1)',fontSize:13,fontWeight:500}}>{s.name}</span></div></td>
                <td style={{padding:'11px 16px',color:'var(--text2)',fontSize:13}}>{s.programme}</td>
                <td style={{padding:'11px 16px'}}><HEBadge variant={s.status}>{s.status.charAt(0).toUpperCase()+s.status.slice(1)}</HEBadge></td>
                <td style={{padding:'11px 16px',color:s.comm>0?'#FCD34D':'var(--text3)',fontFamily:'Oswald',fontWeight:700,fontSize:14}}>{s.comm>0?`RM ${s.comm.toLocaleString()}`:'Pending'}</td>
                <td style={{padding:'11px 16px',color:'var(--text3)',fontSize:12}}>{s.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── PARENT EXTRA SCREENS ────────────────────────────────────
const ParentAttendancePage = ({ d }) => {
  const child=d.children[d.activeChild||0];
  const present=[1,2,3,5,6,8,9,10,12,13,15,16,17,19,20,22,23,24,26,27];
  const absent=[4,11,18];
  const late=[7,14];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Attendance — {child.name}</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>June 2026 · {child.att}% overall rate</div></div>
      <div style={{display:'flex',gap:12}}>
        {[{l:'Present',v:present.length,c:'#16A34A'},{l:'Absent',v:absent.length,c:'#DC2626'},{l:'Late',v:late.length,c:'#F59E0B'},{l:'Rate',v:child.att+'%',c:child.att>=80?'#16A34A':child.att>=65?'#D97706':'#DC2626'}].map(s=>(
          <div key={s.l} style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px',textAlign:'center'}}>
            <div style={{color:s.c,fontFamily:'Oswald',fontWeight:800,fontSize:26}}>{s.v}</div>
            <div style={{color:'var(--text3)',fontSize:12,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
      {child.att<80&&<div style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.25)',borderRadius:10,padding:'12px 16px',color:'#FCA5A5',fontSize:13}}>⚠ Below minimum 80% requirement. Risk of class withdrawal if attendance continues to decline.</div>}
      <div>
        <HESectionLabel>June 2026 Calendar</HESectionLabel>
        <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:5}}>
          {Array.from({length:30},(_,i)=>i+1).map(day=>{
            const p=present.includes(day),a=absent.includes(day),l=late.includes(day);
            const col=p?'#16A34A':a?'#DC2626':l?'#F59E0B':'transparent';
            return (
              <div key={day} style={{background:col+'18',border:`1px solid ${col!=='transparent'?col+'30':'var(--border)'}`,borderRadius:8,padding:'7px 4px',textAlign:'center'}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text2)'}}>{day}</div>
                {col!=='transparent'&&<div style={{width:5,height:5,borderRadius:'50%',background:col,margin:'3px auto 0'}}/>}
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',gap:14,marginTop:10}}>
          {[['#16A34A','Present'],['#DC2626','Absent'],['#F59E0B','Late']].map(([c,l])=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:8,height:8,borderRadius:'50%',background:c}}/><span style={{color:'var(--text3)',fontSize:12}}>{l}</span></div>
          ))}
        </div>
      </div>
      <div>
        <HESectionLabel>By Subject</HESectionLabel>
        {child.grades.map((g,i)=>(
          <div key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',marginBottom:8}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{color:'var(--text1)',fontWeight:600,fontSize:13}}>{g.subject}</span><span style={{color:'#86EFAC',fontWeight:700,fontSize:13}}>{child.att}%</span></div>
            <HEProgress value={child.att} color={child.att>=80?'#16A34A':child.att>=65?'#D97706':'#DC2626'}/>
          </div>
        ))}
      </div>
    </div>
  );
};

const ParentResultsPage = ({ d }) => {
  const child=d.children[d.activeChild||0];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Academic Results — {child.name}</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>{child.programme} · Semester {child.semester}</div></div>
        <HEBtn icon="download" variant="secondary">Download Report Card</HEBtn>
      </div>
      <div style={{background:'linear-gradient(135deg,rgba(22,163,74,0.12) 0%,rgba(27,61,140,0.08) 100%)',border:'1px solid rgba(22,163,74,0.2)',borderRadius:16,padding:'24px 28px',display:'flex',gap:28,alignItems:'center'}}>
        <div style={{textAlign:'center',flexShrink:0}}>
          <div style={{color:'var(--text3)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Current GPA</div>
          <div style={{fontFamily:'Oswald',fontWeight:800,fontSize:56,color:window.gradeColor('B+'),lineHeight:1}}>{child.gpa}</div>
          <div style={{color:window.gradeColor('B+'),fontWeight:700,fontSize:14,marginTop:4}}>B+ / 4.0</div>
        </div>
        <div style={{flex:1,borderLeft:'1px solid var(--border)',paddingLeft:28}}>
          <div style={{display:'flex',gap:20,marginBottom:14}}>
            {[{l:'Attendance',v:child.att+'%'},{l:'Fee Status',v:child.feeBal>0?'Outstanding':'Paid'}].map(s=>(
              <div key={s.l}><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:18}}>{s.v}</div><div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{s.l}</div></div>
            ))}
          </div>
          <div style={{color:'var(--text3)',fontSize:12,marginBottom:6}}>Academic standing: Good</div>
          <HEProgress value={75} color="#16A34A" height={6}/>
        </div>
      </div>
      <div>
        <HESectionLabel>Subjects & Grades</HESectionLabel>
        {child.grades.map((g,i)=>(
          <div key={i} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'18px 20px',marginBottom:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{color:'var(--text1)',fontWeight:600,fontSize:15}}>{g.subject}</div>
              <div style={{textAlign:'right'}}><div style={{color:window.gradeColor(g.grade),fontFamily:'Oswald',fontWeight:800,fontSize:30,lineHeight:1}}>{g.grade}</div><div style={{color:'var(--text3)',fontSize:11,marginTop:2}}>{g.score}/100</div></div>
            </div>
            <HEProgress value={g.score} color={window.gradeColor(g.grade)} height={6}/>
          </div>
        ))}
      </div>
    </div>
  );
};

const ParentFeesPage = ({ d }) => {
  const child=d.children[d.activeChild||0];
  const fees=[{desc:'Tuition Fee — Semester 3',amount:3200,due:'Jul 1, 2026',status:'overdue'},{desc:'Registration Fee',amount:200,due:'Jun 15, 2026',status:'paid'},{desc:'Lab & Materials Fee',amount:150,due:'Jul 15, 2026',status:'pending'}];
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:22}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Fee Payment — {child.name}</div><div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Manage and pay your child's fees</div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
        <HEStatCard icon="fees" label="Total Outstanding" value={fees.filter(f=>f.status!=='paid').reduce((a,b)=>a+b.amount,0)} format="currency" accent="#DC2626"/>
        <HEStatCard icon="check" label="Paid This Semester" value={fees.filter(f=>f.status==='paid').reduce((a,b)=>a+b.amount,0)} format="currency" accent="#16A34A"/>
        <HEStatCard icon="invoices" label="Upcoming Due" value={fees.filter(f=>f.status==='pending').reduce((a,b)=>a+b.amount,0)} format="currency" accent="#F59E0B"/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {fees.map((f,i)=>(
          <div key={i} style={{background:f.status==='overdue'?'rgba(220,38,38,0.07)':'var(--surface)',border:`1px solid ${f.status==='overdue'?'rgba(220,38,38,0.25)':'var(--border)'}`,borderRadius:12,padding:'18px 20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div><div style={{color:'var(--text1)',fontWeight:600,fontSize:14}}>{f.desc}</div><div style={{color:'var(--text3)',fontSize:12,marginTop:2}}>Due: {f.due}</div></div>
              <div style={{textAlign:'right'}}><div style={{color:f.status==='overdue'?'#FCA5A5':'var(--text1)',fontFamily:'Oswald',fontWeight:800,fontSize:22}}>RM {f.amount.toLocaleString()}</div><HEBadge variant={f.status}>{f.status.charAt(0).toUpperCase()+f.status.slice(1)}</HEBadge></div>
            </div>
            {f.status!=='paid'&&<HEBtn variant="primary" icon="fees">Pay Now — RM {f.amount.toLocaleString()}</HEBtn>}
            {f.status==='paid'&&<HEBtn variant="ghost" icon="download" small>Download Receipt</HEBtn>}
          </div>
        ))}
      </div>
    </div>
  );
};

const ParentMessagesPage = ({ d }) => {
  const child=d.children[d.activeChild||0];
  const [msg,setMsg]=useState('');
  const teachers=[{name:'Ms. Linh Tran',sub:'EAP301',reply:'We will monitor attendance closely.'},{name:'Mr. James Wilson',sub:'LSP201',reply:'He is doing well in Listening.'}];
  const [sel,setSel]=useState(0);
  return (
    <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',gap:16,height:'calc(100vh - 130px)'}}>
      <div><div style={{color:'var(--text1)',fontFamily:'Oswald',fontWeight:700,fontSize:24}}>Messages — {child.name}'s Teachers</div></div>
      <div style={{flex:1,display:'flex',gap:16,minHeight:0}}>
        <div style={{width:240,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden',flexShrink:0}}>
          {teachers.map((t,i)=>(
            <div key={i} onClick={()=>setSel(i)} style={{padding:'14px',cursor:'pointer',borderBottom:'1px solid var(--border)',background:sel===i?'rgba(22,163,74,0.1)':'transparent',transition:'background 150ms'}}>
              <div style={{display:'flex',gap:10,alignItems:'center'}}><HEAvatar name={t.name} size={32} color="#16A34A"/><div><div style={{color:'var(--text1)',fontWeight:600,fontSize:13}}>{t.name}</div><div style={{color:'var(--text3)',fontSize:11}}>{t.sub}</div></div></div>
            </div>
          ))}
        </div>
        <div style={{flex:1,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12}}><HEAvatar name={teachers[sel].name} size={34} color="#16A34A"/><div><div style={{color:'var(--text1)',fontWeight:600,fontSize:14}}>{teachers[sel].name}</div><div style={{color:'var(--text3)',fontSize:12}}>{teachers[sel].sub} · {child.name}</div></div></div>
          <div style={{flex:1,padding:'20px',display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'flex',justifyContent:'flex-start',gap:8}}><HEAvatar name={teachers[sel].name} size={26} color="#16A34A"/><div style={{background:'var(--surface2)',borderRadius:'14px 14px 14px 4px',padding:'10px 14px',maxWidth:'70%',color:'var(--text1)',fontSize:13,lineHeight:1.5}}>{teachers[sel].reply}</div></div>
            <div style={{display:'flex',justifyContent:'flex-end'}}><div style={{background:'#16A34A',borderRadius:'14px 14px 4px 14px',padding:'10px 14px',maxWidth:'70%',color:'#fff',fontSize:13,lineHeight:1.5}}>Thank you for the update, {teachers[sel].name.split(' ')[0]}.</div></div>
          </div>
          <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',display:'flex',gap:8}}>
            <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder={`Message ${teachers[sel].name}...`} style={{flex:1,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',color:'var(--text1)',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
            <HEBtn variant="primary" onClick={()=>msg.trim()&&setMsg('')} icon="check">Send</HEBtn>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window,{MgmtKPIAll,MgmtFinancePage,MgmtAnalyticsPage,MgmtPartnerReport,PartnerCommissionPage,PartnerPayoutsPage,PartnerStudentsPage,ParentAttendancePage,ParentResultsPage,ParentFeesPage,ParentMessagesPage});
