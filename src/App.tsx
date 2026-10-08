import { useEffect, useMemo, useState } from 'react';
import { api } from '@appdeploy/client';
import { AlertCircle, Award, BarChart3, BookOpen, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, GraduationCap, LayoutDashboard, LogOut, Menu, Plus, Search, Send, ShieldCheck, Trash2, Users, X } from 'lucide-react';

type Item = { id: string; [key: string]: any };
type Role = 'student' | 'teacher' | 'admin';

const roleCards = [
  { role: 'student' as Role, title: 'Student Login', text: 'Access courses, assignments, grades and attendance.', icon: GraduationCap },
  { role: 'teacher' as Role, title: 'Teacher Login', text: 'Manage assignments, submissions, grades and attendance.', icon: BookOpen },
  { role: 'admin' as Role, title: 'Admin Login', text: 'Control student and teacher accounts, programs and courses.', icon: ShieldCheck },
];

function App() {
  const [user, setUser] = useState<Item | null>(() => {
    try { return JSON.parse(localStorage.getItem('studyflow_user') || 'null'); } catch { return null; }
  });
  const [loginRole, setLoginRole] = useState<Role | null>(null);
  const [loginError, setLoginError] = useState('');
  const [active, setActive] = useState('dashboard');
  const [programs, setPrograms] = useState<Item[]>([]);
  const [courses, setCourses] = useState<Item[]>([]);
  const [assignments, setAssignments] = useState<Item[]>([]);
  const [exams, setExams] = useState<Item[]>([]);
  const [submissions, setSubmissions] = useState<Item[]>([]);
  const [users, setUsers] = useState<Item[]>([]);
  const [attendance, setAttendance] = useState<Item[]>([]);
  const [excuses, setExcuses] = useState<Item[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showSubmit, setShowSubmit] = useState<Item | null>(null);
  const [showGrade, setShowGrade] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
    const result = await api.get('/api/study');
    setPrograms(result.data.programs || []);
    setCourses(result.data.courses || []);
    setAssignments(result.data.assignments || []);
    setExams(result.data.exams || []);
    setSubmissions(result.data.submissions || []);
    setUsers(result.data.users || []);
    setAttendance(result.data.attendance || []);
    setExcuses(result.data.excuses || []);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (user) load().catch(() => setError('Unable to load StudyFlow data.'));
  }, [user]);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError('');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const result = await api.post('/api/auth/login', { email: data.email, password: data.password, role: loginRole });
      setUser(result.data.user);
      localStorage.setItem('studyflow_user', JSON.stringify(result.data.user));
      setLoginRole(null);
      setActive('dashboard');
    } catch (err: any) {
      setLoginError(err?.message || 'Invalid email, password or account type.');
    }
  }

  function logout() {
    localStorage.removeItem('studyflow_user');
    setUser(null);
    setLoginRole(null);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      if (formType === 'user') {
        await api.post('/api/admin/users', {
          ...data,
          role: data.role,
          courseIds: data.courseIds ? String(data.courseIds).split(',').map(x => x.trim()).filter(Boolean) : [],
        });
      } else {
        await api.post('/api/study', { type: formType, data });
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not save this item.');
    }
  }

  async function submitAssignment(a: Item, code: string) {
    if (!code.trim()) return;
    try {
      await api.post('/api/study', {
        type: 'submission',
        data: {
          assignmentId: a.id,
          assignmentTitle: a.title,
          courseId: a.courseId,
          courseName: courses.find(c => c.id === a.courseId)?.name || '',
          studentId: user.id,
          studentName: user.name,
          teacherId: a.teacherId || '',
          code,
          submittedAt: new Date().toISOString(),
          status: 'Submitted',
        },
      });
      setShowSubmit(null);
      setNotice('Assignment submitted successfully.');
      await load();
    } catch {
      setError('Could not submit the assignment.');
    }
  }

  async function updateItem(item: Item, type: string, changes: Item) {
    try {
      await api.put('/api/study/' + item.id, { type, data: { ...item, ...changes } });
      await load();
    } catch { setError('Could not update this item.'); }
  }

  async function remove(item: Item, type: string) {
    if (!window.confirm('Delete this item? This cannot be undone.')) return;
    try { await api.delete('/api/study/' + item.id, { type }); setNotice('Item deleted.'); await load(); }
    catch { setError('Could not delete this item.'); }
  }

  const studentCourses = useMemo(() => {
    if (!user?.courseIds?.length) return courses;
    return courses.filter(c => user.courseIds.includes(c.id));
  }, [courses, user]);

  const studentAssignments = useMemo(() => {
    if (!user?.courseIds?.length) return assignments;
    return assignments.filter(a => user.courseIds.includes(a.courseId));
  }, [assignments, user]);

  const teacherAssignments = useMemo(() => {
    if (user?.role !== 'teacher') return assignments;
    return assignments.filter(a => a.teacherId === user.id || !a.teacherId);
  }, [assignments, user]);

  const nav = user?.role === 'admin'
    ? [['dashboard','Dashboard'],['users','Accounts'],['programs','Programs'],['courses','Courses'],['attendance','Attendance']]
    : user?.role === 'teacher'
      ? [['dashboard','Dashboard'],['assignments','Assignments'],['submissions','Submissions'],['attendance','Attendance'],['excuses','Excuses']]
      : [['dashboard','Dashboard'],['courses','Courses'],['assignments','Assignments'],['exams','Exams'],['grades','My Grades'],['attendance','Attendance'],['excuses','My Excuses']];

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500"><GraduationCap size={34}/></div>
            <h1 className="text-4xl font-bold">StudyFlow</h1>
            <p className="mt-2 text-slate-400">Choose your account type to continue</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {roleCards.map(card => {
              const Icon = card.icon;
              return <button key={card.role} onClick={() => { setLoginRole(card.role); setLoginError(''); }} className="rounded-3xl border border-slate-800 bg-slate-900 p-7 text-left transition hover:-translate-y-1 hover:border-indigo-500">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400"><Icon size={28}/></div>
                <h2 className="text-xl font-bold">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{card.text}</p>
                <span className="mt-6 inline-block rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold">Continue</span>
              </button>;
            })}
          </div>
          {loginRole && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <form onSubmit={login} className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-7">
              <div className="mb-6 flex items-center justify-between"><div><p className="text-sm text-indigo-400">StudyFlow</p><h2 className="text-2xl font-bold">{loginRole[0].toUpperCase()+loginRole.slice(1)} Login</h2></div><button type="button" onClick={() => setLoginRole(null)}><X/></button></div>
              {loginError && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{loginError}</div>}
              <label className="text-sm text-slate-400">Email<input name="email" type="email" required className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none" placeholder="you@example.com"/></label>
              <label className="mt-4 block text-sm text-slate-400">Password<input name="password" type="password" required className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none" placeholder="Enter password"/></label>
              <button className="mt-6 w-full rounded-xl bg-indigo-500 py-3 font-semibold">Login</button>
              {loginRole === 'admin' && <p className="mt-4 text-xs text-slate-500">For the initial school setup, create the admin account on the backend before logging in.</p>}
            </form>
          </div>}
        </div>
      </div>
    );
  }

  const openForm = (type: string) => { setFormType(type); setShowForm(true); setError(''); };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-800 bg-slate-900 p-5 md:block">
        <div className="mb-8 flex items-center gap-3"><div className="rounded-xl bg-indigo-500 p-2"><GraduationCap size={22}/></div><div><h1 className="font-bold">StudyFlow</h1><p className="text-xs text-slate-400">{user.role} portal</p></div><button onClick={() => setMobileOpen(false)} className="ml-auto md:hidden"><X size={18}/></button></div>
        <nav className="space-y-2">{nav.map(([id,label]) => <button key={id} onClick={() => { setActive(id); setMobileOpen(false); }} className={`w-full rounded-xl px-4 py-3 text-left ${active===id?'bg-indigo-500':'text-slate-400 hover:bg-slate-800'}`}>{label}</button>)}</nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-slate-800/70 p-4"><p className="font-semibold">{user.name}</p><p className="text-xs text-slate-400">{user.email}</p><button onClick={logout} className="mt-3 flex items-center gap-2 text-sm text-red-300"><LogOut size={15}/> Logout</button></div>
      </aside>

      <main className="md:ml-64">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-800 p-2 md:hidden"><Menu size={19}/></button><p className="text-sm text-indigo-400">Welcome, {user.name}</p><h2 className="text-xl font-bold">{nav.find(n=>n[0]===active)?.[1]}</h2></div>
          {((user.role==='admin' && ['users','programs','courses'].includes(active)) || (user.role==='teacher' && active==='assignments')) && <button onClick={() => openForm(user.role==='admin' ? (active==='users'?'user':active.slice(0,-1)) : 'assignment')} className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 font-semibold"><Plus size={18}/> Add</button>}</div>
        </header>

        <div className="mx-auto max-w-6xl p-5 md:p-8">
          {error && <div className="mb-4 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"><span className="flex items-center gap-2"><AlertCircle size={17}/>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
          {notice && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>}
          {loading && <div className="mb-4 h-1 overflow-hidden rounded-full bg-slate-900"><div className="h-full w-1/3 animate-pulse bg-indigo-500"/></div>}

          {active==='dashboard' && <Dashboard user={user} courses={user.role==='student'?studentCourses:courses} assignments={user.role==='student'?studentAssignments:teacherAssignments} submissions={submissions} attendance={attendance} users={users} setActive={setActive}/>} 

          {active==='users' && user.role==='admin' && <List title="School accounts" items={users} extra={u=>`${u.role} · ${u.disabled?'Disabled':'Active'}`} onDelete={x=>updateItem(x,'user',{disabled:!x.disabled})} actionLabel="Toggle status"/>}

          {active==='programs' && <List title="Programs" items={programs} extra={p=>`${courses.filter(c=>c.programId===p.id).length} courses`} onDelete={x=>remove(x,'program')}/>}
          {active==='courses' && <List title="Courses" items={user.role==='student'?studentCourses:courses} extra={c=>programs.find(p=>p.id===c.programId)?.name || 'No program'} onDelete={x=>remove(x,'course')}/>}

          {active==='assignments' && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 font-bold">{user.role==='student'?'Your assignments':'Assignments you teach'}</h3><div className="space-y-3">{(user.role==='student'?studentAssignments:teacherAssignments).map(a=><div key={a.id} className="flex items-center justify-between rounded-xl bg-slate-800/60 p-4"><div><p className="font-medium">{a.title}</p><p className="text-xs text-slate-400">{courses.find(c=>c.id===a.courseId)?.name || 'Course'} · Due {a.dueDate || 'No date'}</p></div>{user.role==='student'?<button disabled={submissions.some(s=>s.assignmentId===a.id&&s.studentId===user.id)} onClick={()=>setShowSubmit(a)} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold disabled:bg-slate-700">{submissions.some(s=>s.assignmentId===a.id&&s.studentId===user.id)?'Submitted':'Submit Work'}</button>:<button onClick={()=>remove(a,'assignment')} className="text-sm text-red-300">Delete</button>}</div>)}</div></div>}

          {active==='submissions' && user.role==='teacher' && <div className="space-y-3">{submissions.filter(s=>s.teacherId===user.id || !s.teacherId).map(s=><div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex justify-between"><div><h3 className="font-bold">{s.studentName || 'Student'}</h3><p className="text-sm text-slate-400">{s.assignmentTitle || 'Assignment'} · {s.courseName || ''}</p></div><span className="text-indigo-300">{s.grade != null ? `${s.grade}%` : 'Pending'}</span></div><pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-300">{s.code || s.content || 'No code submitted.'}</pre><button onClick={()=>setShowGrade(s)} className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold">{s.grade != null ? 'Update grade' : 'Assess submission'}</button></div>)}</div>}

          {active==='grades' && user.role==='student' && <div className="grid gap-4">{studentAssignments.map(a=>{const s=submissions.find(x=>x.assignmentId===a.id && x.studentId===user.id);return <div key={a.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex justify-between"><span>{a.title}</span><b>{s?.grade != null ? s.grade+'%' : 'Not graded'}</b></div><p className="mt-2 text-sm text-slate-400">{s?.feedback || 'Awaiting teacher assessment.'}</p></div>})}</div>}

          {active==='attendance' && <Attendance attendance={attendance} user={user} courses={courses} onSave={async data=>{await api.post('/api/study',{type:'attendance',data});await load();}}/>}

          {active==='excuses' && <Excuses excuses={excuses} user={user} onSave={async data=>{await api.post('/api/study',{type:'excuse',data});await load();}} onUpdate={updateItem}/>}

          {active==='exams' && <List title="Exams" items={exams} extra={e=>courses.find(c=>c.id===e.courseId)?.name || 'Course'} onDelete={x=>remove(x,'exam')}/>}
        </div>
      </main>

      {showSubmit && <SubmitModal assignment={showSubmit} onClose={() => setShowSubmit(null)} onSubmit={(code:string) => submitAssignment(showSubmit, code)}/>}\n      {showGrade && <GradeModal submission={showGrade} onClose={() => setShowGrade(null)} onSubmit={async (grade:number, feedback:string) => { await updateItem(showGrade,'submission',{grade,feedback}); setShowGrade(null); }}/>}\n\n      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><form onSubmit={save} className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-bold">Add {formType}</h3><button type="button" onClick={()=>setShowForm(false)}><X/></button></div>
        {formType==='user' && <><Field name="name" label="Full name"/><Field name="email" label="Email" type="email"/><Field name="password" label="Temporary password" type="password"/><label className="mt-4 block text-sm text-slate-400">Role<select name="role" className="mt-2 w-full rounded-xl bg-slate-800 p-3"><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option></select></label><Field name="programId" label="Program ID (optional)"/><Field name="courseIds" label="Course IDs, comma separated (optional)"/></>}
        {formType==='program' && <Field name="name" label="Program name"/>}
        {formType==='course' && <><Field name="name" label="Course name"/><label className="mt-4 block text-sm text-slate-400">Program<select name="programId" className="mt-2 w-full rounded-xl bg-slate-800 p-3">{programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></>}
        {formType==='assignment' && <><Field name="title" label="Assignment title"/><Field name="instructions" label="Instructions"/><label className="mt-4 block text-sm text-slate-400">Course<select name="courseId" className="mt-2 w-full rounded-xl bg-slate-800 p-3">{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><Field name="dueDate" label="Due date" type="date"/><input type="hidden" name="teacherId" value={user.id}/></>}
        <button className="mt-6 w-full rounded-xl bg-indigo-500 py-3 font-semibold">Save</button>
      </form></div>}
    </div>
  );
}

\nfunction Dashboard({user,courses,assignments,submissions,attendance,users,setActive}:any) { const graded=submissions.filter((s:any)=>s.grade!=null); const avg=graded.length?Math.round(graded.reduce((n:number,s:any)=>n+Number(s.grade),0)/graded.length):0; const mine=user.role==='student'?attendance.filter((a:any)=>a.studentId===user.id):attendance; const rate=mine.length?Math.round(mine.filter((a:any)=>a.status==='Present').length/mine.length*100):0; const stats=user.role==='student'?[[BookOpen,'My Courses',courses.length],[ClipboardList,'Assignments',assignments.length],[Award,'Average Grade',graded.length?avg+'%':'—'],[CheckCircle2,'Attendance',mine.length?rate+'%':'—']]:user.role==='teacher'?[[ClipboardList,'Assignments',assignments.length],[Send,'Submissions',submissions.length],[BookOpen,'Courses',courses.length],[CheckCircle2,'Attendance',attendance.length]]:[[Users,'Accounts',users.length],[BookOpen,'Courses',courses.length],[ClipboardList,'Assignments',assignments.length],[CheckCircle2,'Attendance',attendance.length]]; return <div className="space-y-6"><section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-indigo-600/20 via-slate-900 to-slate-900 p-6 sm:p-8"><p className="text-sm font-semibold text-indigo-300">Academic overview</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">{user.role==='student'?'Keep your learning moving.':'Stay on top of school activity.'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Your important academic activity is organized here so you can quickly see what needs attention.</p></section><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([Icon,label,value]:any)=><Stat key={label} icon={Icon} label={label} value={value}/>)}</div><section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold">Recent assignments</h3><p className="text-xs text-slate-500">Your latest academic work</p></div><button onClick={()=>setActive('assignments')} className="text-sm font-semibold text-indigo-300">View all</button></div>{assignments.slice(0,5).map((a:any)=><div key={a.id} className="mb-2 flex items-center justify-between rounded-xl bg-slate-800/50 p-3.5"><div><p className="font-medium">{a.title}</p><p className="mt-1 text-xs text-slate-500">{courses.find((c:any)=>c.id===a.courseId)?.name||'Course'} · Due {a.dueDate||'No date'}</p></div><ChevronRight size={16} className="text-slate-600"/></div>)}</section></div>; }\nfunction SubmitModal({assignment,onClose,onSubmit}:any){const [code,setCode]=useState('');return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6"><div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-bold">Submit: {assignment.title}</h3><button onClick={onClose}><X/></button></div><p className="mb-4 text-sm text-slate-400">Paste your completed code below.</p><textarea value={code} onChange={e=>setCode(e.target.value)} rows={15} className="w-full rounded-xl bg-slate-950 p-4 font-mono text-xs outline-none" placeholder="Paste your code here..."/><button disabled={!code.trim()} onClick={()=>onSubmit(code)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 font-semibold disabled:bg-slate-700"><Send size={17}/> Submit assignment</button></div></div>; }\nfunction GradeModal({submission,onClose,onSubmit}:any){const [grade,setGrade]=useState(submission.grade?.toString()||'');const [feedback,setFeedback]=useState(submission.feedback||'');return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6"><div className="mb-5 flex items-center justify-between"><h3 className="text-xl font-bold">Assess submission</h3><button onClick={onClose}><X/></button></div><p className="text-sm text-slate-400">{submission.studentName} · {submission.assignmentTitle}</p><label className="mt-5 block text-sm text-slate-400">Grade (0–100)<input type="number" min="0" max="100" value={grade} onChange={e=>setGrade(e.target.value)} className="mt-2 w-full rounded-xl bg-slate-800 p-3"/></label><label className="mt-4 block text-sm text-slate-400">Feedback<textarea value={feedback} onChange={e=>setFeedback(e.target.value)} rows={5} className="mt-2 w-full rounded-xl bg-slate-800 p-3"/></label><button onClick={()=>onSubmit(Math.max(0,Math.min(100,Number(grade))),feedback)} className="mt-5 w-full rounded-xl bg-indigo-500 py-3 font-semibold">Save assessment</button></div></div>; }\nfunction Field({name,label,type='text'}:{name:string;label:string;type?:string}) {
  return <label className="mt-4 block text-sm text-slate-400">{label}<input name={name} type={type} required={name!=='instructions'} className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none"/></label>;
}
function Stat({icon:Icon,label,value}:{icon:any;label:string;value:any}) { return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><Icon className="mb-4 text-indigo-400"/><p className="text-sm text-slate-400">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>; }
function List({title,items,extra,onDelete,actionLabel}:{title:string;items:Item[];extra:(i:Item)=>string;onDelete?:((i:Item)=>void);actionLabel?:string}) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 font-bold">{title}</h3>{items.length?<div className="space-y-3">{items.map(i=><div key={i.id} className="flex items-center justify-between rounded-xl bg-slate-800/60 p-4"><div><p className="font-medium">{i.name||i.title}</p><p className="text-xs text-slate-400">{extra(i)}</p></div>{onDelete&&<button onClick={()=>onDelete(i)} className="text-sm text-indigo-300">{actionLabel || 'Delete'}</button>}</div>)}</div>:<p className="text-slate-400">Nothing here yet.</p>}</div>;
}
function Attendance({attendance,user,courses,onSave}:{attendance:Item[];user:Item;courses:Item[];onSave:(d:Item)=>Promise<void>}) {
  const mine=user.role==='student'?attendance.filter(a=>a.studentId===user.id):attendance;
  const eligible=(courseId:string)=>{const rows=mine.filter(a=>a.courseId===courseId);if(!rows.length)return true;const score=rows.reduce((n,a)=>n+(a.status==='Present'?1:a.status==='Late'?0.5:0),0)/rows.length*100;return score>=80;};
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 font-bold">Attendance & Exam Eligibility</h3>{user.role!=='student'&&<form onSubmit={async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());await onSave({...d,teacherId:user.id});e.currentTarget.reset();}} className="mb-6 grid gap-3 md:grid-cols-4"><input name="studentName" placeholder="Student name" className="rounded-xl bg-slate-800 p-3"/><select name="courseId" className="rounded-xl bg-slate-800 p-3">{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select name="status" className="rounded-xl bg-slate-800 p-3"><option>Present</option><option>Late</option><option>Absent</option></select><button className="rounded-xl bg-indigo-500 p-3 font-semibold">Record</button></form>}{courses.map(c=><div key={c.id} className="mb-3 flex items-center justify-between rounded-xl bg-slate-800/60 p-4"><span>{c.name}</span><span className={eligible(c.id)?'text-emerald-300':'text-red-300'}>{eligible(c.id)?'Eligible (80%+)':'Not Eligible'}</span></div>)}</div>;
}
function Excuses({excuses,user,onSave,onUpdate}:{excuses:Item[];user:Item;onSave:(d:Item)=>Promise<void>;onUpdate:(i:Item,t:string,c:Item)=>Promise<void>}) {
  const mine=user.role==='student'?excuses.filter(x=>x.studentId===user.id):excuses;
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 font-bold">{user.role==='student'?'My Attendance Excuses':'Attendance Excuse Requests'}</h3>{user.role==='student'&&<form onSubmit={async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());await onSave({...d,studentId:user.id,status:'Pending'});e.currentTarget.reset();}} className="mb-6 flex gap-3"><input name="reason" required placeholder="Reason for absence" className="flex-1 rounded-xl bg-slate-800 p-3"/><button className="rounded-xl bg-indigo-500 px-5 font-semibold">Submit</button></form>}{mine.map(x=><div key={x.id} className="mb-3 rounded-xl bg-slate-800/60 p-4"><div className="flex justify-between"><span>{x.reason}</span><b>{x.status||'Pending'}</b></div>{user.role!=='student'&&x.status==='Pending'&&<div className="mt-3 flex gap-2"><button onClick={()=>onUpdate(x,'excuse',{status:'Approved',teacherId:user.id})} className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-300">Approve</button><button onClick={()=>onUpdate(x,'excuse',{status:'Rejected',teacherId:user.id})} className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300">Reject</button></div>}</div>)}</div>;
}

export default App;
