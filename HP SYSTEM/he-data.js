// HE-SYSTEM — Data Layer: i18n, icons, portal config, mock data

window.HE_I18N = {
  en: {
    nav: {
      dashboard:'Dashboard', attendance:'Attendance', timetable:'Timetable',
      results:'Results', fees:'Fees', wallet:'E-Wallet', location:'Location',
      messages:'Messages', kpi:'KPI', grades:'Grades', students:'Students',
      leave:'Leave', reports:'Reports', staff:'Staff', enrolment:'Enrolment',
      invoices:'Invoices', partners:'Partners', finance:'Finance',
      analytics:'Analytics', commission:'Commission', payouts:'Payouts',
      leaderboard:'Leaderboard', profile:'Profile', settings:'Settings', logout:'Log Out',
    },
    portals: {
      student:'Student Portal', teacher:'Teacher Portal', admin:'Admin Portal',
      management:'Management Portal', partner:'Partner Portal', parent:'Parent Portal',
    },
    desc: {
      student:'Attendance, grades, fees & timetable',
      teacher:'KPI tracking, OTP & grade entry',
      admin:'Enrolment, invoicing & operations',
      management:'Institution-wide analytics & oversight',
      partner:'Commission tracking & tier rewards',
      parent:"Monitor your child's academic journey",
    },
    welcome:'Welcome back', viewAll:'View All', search:'Search...',
    choosePortal:'Choose your portal to continue',
    tagline:'Happy English Learning Platform',
  },
  vi: {
    nav: {
      dashboard:'Tổng quan', attendance:'Điểm danh', timetable:'TKB',
      results:'Kết quả', fees:'Học phí', wallet:'Ví điện tử', location:'Vị trí',
      messages:'Tin nhắn', kpi:'KPI', grades:'Điểm', students:'Sinh viên',
      leave:'Nghỉ phép', reports:'Báo cáo', staff:'Nhân viên', enrolment:'Tuyển sinh',
      invoices:'Hóa đơn', partners:'Đối tác', finance:'Tài chính',
      analytics:'Phân tích', commission:'Hoa hồng', payouts:'Thanh toán',
      leaderboard:'BXH', profile:'Hồ sơ', settings:'Cài đặt', logout:'Đăng xuất',
    },
    portals: {
      student:'Cổng sinh viên', teacher:'Cổng giáo viên', admin:'Cổng quản trị',
      management:'Cổng quản lý', partner:'Cổng đối tác', parent:'Cổng phụ huynh',
    },
    desc: {
      student:'Điểm danh, điểm số, học phí & TKB',
      teacher:'Theo dõi KPI, OTP & nhập điểm',
      admin:'Tuyển sinh, hóa đơn & vận hành',
      management:'Phân tích toàn trường & giám sát',
      partner:'Theo dõi hoa hồng & cấp bậc',
      parent:'Theo dõi hành trình học của con',
    },
    welcome:'Chào mừng trở lại', viewAll:'Xem tất cả', search:'Tìm kiếm...',
    choosePortal:'Chọn cổng truy cập để tiếp tục',
    tagline:'Nền tảng học tiếng Anh Happy English',
  },
};

window.HE_ICONS = {
  dashboard:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  attendance:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  timetable:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  results:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  fees:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  wallet:'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  location:'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  messages:'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  kpi:'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  grades:'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  students:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  leave:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  reports:'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  staff:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  enrolment:'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  invoices:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  partners:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  finance:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  analytics:'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  commission:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  payouts:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  leaderboard:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  profile:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  settings:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  logout:'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  bell:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  search:'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  moon:'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  sun:'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  globe:'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
  mobile:'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  chevronRight:'M9 5l7 7-7 7', chevronLeft:'M15 19l-7-7 7-7', chevronDown:'M19 9l-7 7-7-7',
  close:'M6 18L18 6M6 6l12 12', check:'M5 13l4 4L19 7', plus:'M12 4v16m8-8H4',
  exclamation:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  info:'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  download:'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  otp:'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  refresh:'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  eye:'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  trending:'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  arrowUp:'M5 10l7-7m0 0l7 7m-7-7v18', arrowDown:'M19 14l-7 7m0 0l-7-7m7 7V3',
  map:'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  star:'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
};

window.HE_PORTALS = {
  student:    { color:'#1B3D8C', accent:'#2E5FCC', emoji:'🎓', nav:['dashboard','attendance','timetable','results','fees','wallet','messages','profile'] },
  teacher:    { color:'#1B3D8C', accent:'#2E5FCC', emoji:'👩‍🏫', nav:['dashboard','kpi','attendance','grades','timetable','students','leave','profile'] },
  admin:      { color:'#475569', accent:'#64748B', emoji:'⚙️', nav:['dashboard','students','enrolment','invoices','partners','staff','timetable','reports'] },
  management: { color:'#7C3AED', accent:'#8B5CF6', emoji:'📊', nav:['dashboard','kpi','finance','enrolment','partners','reports'] },
  partner:    { color:'#D97706', accent:'#F59E0B', emoji:'🤝', nav:['dashboard','students','commission','payouts','leaderboard','profile'] },
  parent:     { color:'#16A34A', accent:'#22C55E', emoji:'👨‍👩‍👧', nav:['dashboard','attendance','results','fees','messages'] },
};

window.HE_MOCK = {
  student: {
    name:'Nguyen Van An', id:'APD21110001', avatar:'NA',
    programme:'Diploma in English Language', intake:'Jan 2024', semester:3,
    attendance:85, gpa:3.42, feeBalance:2400, upcomingClasses:3, notifs:4,
    timetable:[
      {time:'08:00–09:30', subject:'English for Academic Purposes', room:'B-301', type:'campus', teacher:'Ms. Linh Tran'},
      {time:'10:00–11:30', subject:'Listening & Speaking', room:'Zoom', type:'remote', teacher:'Mr. James Wilson'},
      {time:'14:00–15:30', subject:'Writing for IELTS', room:'C-105', type:'campus', teacher:'Ms. Phuong Nguyen'},
    ],
    subjects:[
      {code:'EAP301', name:'English for Academic Purposes', att:88, grade:'B+', progress:72},
      {code:'LSP201', name:'Listening & Speaking', att:92, grade:'A-', progress:84},
      {code:'WRT301', name:'Writing for IELTS', att:79, grade:'B', progress:68},
      {code:'GRM201', name:'Grammar & Usage', att:91, grade:'A', progress:91},
    ],
    fees:[
      {desc:'Tuition Fee — Semester 3', amount:3200, due:'Jul 1, 2026', status:'overdue'},
      {desc:'Registration Fee', amount:200, due:'Jun 15, 2026', status:'paid'},
      {desc:'Lab & Materials Fee', amount:150, due:'Jul 15, 2026', status:'pending'},
    ],
    walletBal:145.50,
    wallet:[
      {desc:'Canteen — Lunch', amt:-12.50, date:'Jun 7'},
      {desc:'Top Up', amt:100.00, date:'Jun 5'},
      {desc:'Printing Services', amt:-5.00, date:'Jun 4'},
      {desc:'Library Fine', amt:-2.00, date:'Jun 2'},
    ],
    attCalendar:{
      present:[1,2,3,5,6,8,9,10,12,13,15,16,17,19,20,22,23,24,26,27],
      absent:[4,11,18], late:[7,14],
    },
  },
  teacher: {
    name:'Ms. Linh Tran', id:'TCH-0042', avatar:'LT', notifs:2,
    dept:'English Language Studies',
    kpi:78.4, grade:'B',
    pillars:[
      {name:'Teaching Hours', weight:25, score:82, grade:'B', color:'#2E5FCC'},
      {name:'Student Outcomes', weight:35, score:76, grade:'C+', color:'#DC2626'},
      {name:'Admin Tasks', weight:25, score:80, grade:'B', color:'#F59E0B'},
      {name:'R&D Activities', weight:15, score:70, grade:'C', color:'#16A34A'},
    ],
    otpCode:'472 819', otpClass:'EAP301 — English for Academic Purposes', otpSecs:840,
    classes:[
      {code:'EAP301', name:'English for Academic Purposes', students:24, time:'08:00', room:'B-301', type:'campus'},
      {code:'GRM201', name:'Grammar & Usage', students:28, time:'13:00', room:'B-205', type:'campus'},
      {code:'WRT302', name:'Advanced Writing', students:18, time:'15:00', room:'Zoom', type:'remote'},
    ],
    deadlines:[
      {task:'Mid-term Essay Grading — EAP301', due:'Jun 10', priority:'high'},
      {task:'Monthly Report Submission', due:'Jun 15', priority:'medium'},
      {task:'Quiz Results — GRM201', due:'Jun 20', priority:'low'},
    ],
    attStudents:[
      {name:'Tran Van Binh', id:'APD21110045', status:'present'},
      {name:'Le Thi Hoa', id:'APD21110023', status:'present'},
      {name:'Nguyen Duc Anh', id:'APD21110067', status:'absent'},
      {name:'Pham Thu Ha', id:'APD21110089', status:'late'},
      {name:'Vo Minh Khoa', id:'APD21110012', status:'present'},
    ],
  },
  admin: {
    name:'Tran Thi Mai', id:'ADM-0007', avatar:'TM', notifs:5,
    totalStudents:1247, newEnrolments:43, pendingInvoices:18, pendingTasks:7,
    students:[
      {name:'Pham Minh Duc', programme:'Diploma English', status:'active', date:'Jun 1', id:'APD24060001'},
      {name:'Le Thi Hoa', programme:'IELTS Preparation', status:'pending', date:'Jun 3', id:'APD24060002'},
      {name:'Nguyen Thanh Long', programme:'Business English', status:'active', date:'Jun 5', id:'APD24060003'},
      {name:'Vo Thi Thu', programme:'Cambridge Young Learners', status:'active', date:'Jun 6', id:'APD24060004'},
      {name:'Bui Hoang Nam', programme:'Diploma English', status:'inactive', date:'May 28', id:'APD24050087'},
    ],
    invoices:[
      {student:'Bui Van Hieu', amount:3200, due:'Jun 10', overdue:true, inv:'HE-2026-0234'},
      {student:'Nguyen Lan Anh', amount:2400, due:'Jun 15', overdue:false, inv:'HE-2026-0235'},
      {student:'Tran Quoc Bao', amount:1800, due:'Jun 20', overdue:false, inv:'HE-2026-0236'},
    ],
  },
  management: {
    name:'Dr. Bui Van Khanh', id:'MGT-0001', avatar:'BK', notifs:3,
    revenue:1284600, revenueTarget:1500000,
    students:1247, studentTarget:1500,
    teachers:42, avgKpi:74.2, outstanding:187400, commission:52300,
    chart:[98000,112000,125000,108000,134000,141200],
    chartLabels:['Jan','Feb','Mar','Apr','May','Jun'],
    topTeachers:[
      {name:'James Wilson', kpi:91.2, grade:'A', trend:'up'},
      {name:'Phuong Nguyen', kpi:88.5, grade:'A-', trend:'up'},
      {name:'Linh Tran', kpi:78.4, grade:'B', trend:'neutral'},
      {name:'Minh Hoang', kpi:65.1, grade:'D', trend:'down'},
    ],
    alerts:[
      {type:'warning', msg:'18 students at risk — attendance below 65%'},
      {type:'danger', msg:'RM 187,400 outstanding — 23 overdue invoices'},
      {type:'info', msg:'June enrolment: 43 new students (target: 50)'},
    ],
  },
  partner: {
    name:'Nguyen Hoang Phuc', id:'PTR-0312', avatar:'NP', notifs:1,
    tier:'gold', recruited:38, rate:23.2,
    totalEarned:87400, thisMonth:14200, nextTierAt:61, pending:14200,
    students:[
      {name:'Tran Van Binh', programme:'IELTS Prep', status:'enrolled', comm:1160, date:'May 2026'},
      {name:'Le Minh Chau', programme:'Business English', status:'enrolled', comm:1160, date:'May 2026'},
      {name:'Pham Thu Hien', programme:'Diploma English', status:'pending', comm:0, date:'Jun 2026'},
      {name:'Nguyen Duc Anh', programme:'Cambridge YL', status:'enrolled', comm:928, date:'Apr 2026'},
    ],
    leaderboard:[
      {rank:1, name:'Pham Van Cuong', students:72, tier:'platinum', earned:126000},
      {rank:2, name:'Le Thi Hong', students:55, tier:'gold', earned:98000},
      {rank:3, name:'Nguyen Hoang Phuc', students:38, tier:'gold', earned:87400, isMe:true},
      {rank:4, name:'Tran Quoc Anh', students:29, tier:'silver', earned:52000},
      {rank:5, name:'Bui Van Minh', students:21, tier:'silver', earned:37800},
    ],
  },
  parent: {
    name:'Nguyen Van Thanh', id:'PAR-0089', avatar:'NT', notifs:2,
    activeChild:0,
    children:[
      {name:'Nguyen Van An', id:'APD21110001', att:85, gpa:3.42, feeBal:2400,
       programme:'Diploma English', semester:3, attAlerts:2,
       grades:[
         {subject:'English for Academic Purposes', grade:'B+', score:74},
         {subject:'Listening & Speaking', grade:'A-', score:82},
         {subject:'Writing for IELTS', grade:'B', score:70},
       ]},
      {name:'Nguyen Thi Bich', id:'APD22010045', att:91, gpa:3.78, feeBal:0,
       programme:'IELTS Preparation', semester:2, attAlerts:0,
       grades:[
         {subject:'IELTS Reading', grade:'A', score:88},
         {subject:'IELTS Writing', grade:'B+', score:76},
       ]},
    ],
  },
};

window.gradeColor = (g) => {
  const m = {'A':'#16A34A','A-':'#22C55E','B+':'#3B82F6','B':'#60A5FA','B-':'#93C5FD','C+':'#D97706','C':'#F59E0B','D':'#DC2626','F':'#991B1B'};
  return m[g] || '#64748B';
};
