import { useEffect, useMemo, useState } from 'react';
import { api } from '@appdeploy/client';
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Users,
  BookMarked,
  CalendarDays,
  ShieldCheck,
  Activity,
  LogOut,
  Menu,
  Plus,
  Send,
  X,
  LoaderCircle,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

type Item = { id: string; [key: string]: any };
type Role = 'student' | 'teacher' | 'admin';

const roleCards = [
  { role: 'student' as Role, title: 'Student Login', text: 'Access courses, assignments, grades and attendance.', icon: GraduationCap },
  { role: 'teacher' as Role, title: 'Teacher Login', text: 'Manage assignments, submissions, grades and attendance.', icon: BookOpen },
];

function App() {
  const [user, setUser] = useState<Item | null>(() => {
    if (window.location.hash === '#admin') return null;
    try {
      const saved = JSON.parse(localStorage.getItem('studyflow_user') || 'null');
      return saved && ['student', 'teacher', 'admin'].includes(saved.role) ? saved : null;
    } catch {
      return null;
    }
  });
  const [loginRole, setLoginRole] = useState<Role | null>(() => window.location.hash === '#admin' ? 'admin' : null);
  const [loginMode, setLoginMode] = useState<'login' | 'signup'>('login');
  const [loginError, setLoginError] = useState('');
  const [registeredAccount, setRegisteredAccount] = useState<Item | null>(null);
  const [active, setActive] = useState('dashboard');
  const [programs, setPrograms] = useState<Item[]>([]);
  const [courses, setCourses] = useState<Item[]>([]);
  const [assignments, setAssignments] = useState<Item[]>([]);
  const [exams, setExams] = useState<Item[]>([]);
  const [submissions, setSubmissions] = useState<Item[]>([]);
  const [results, setResults] = useState<Item[]>([]);
  const [users, setUsers] = useState<Item[]>([]);
  const [attendance, setAttendance] = useState<Item[]>([]);
  const [excuses, setExcuses] = useState<Item[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSubmit, setShowSubmit] = useState<Item | null>(null);
  const [showGrade, setShowGrade] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(user));
  const [loginBusy, setLoginBusy] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    const updateNetworkStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  useEffect(() => {
    const syncPortal = () => {
      if (window.location.hash === '#admin') {
        setUser(current => {
          if (current && current.role !== 'admin') {
            localStorage.removeItem('studyflow_user');
            return null;
          }
          return current;
        });
        setLoginRole('admin');
      } else {
        setLoginRole(null);
        setLoginError('');
      }
    };
    window.addEventListener('hashchange', syncPortal);
    return () => window.removeEventListener('hashchange', syncPortal);
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const clean = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'PRE'].includes(parent.tagName)) continue;
        if (node.nodeValue?.includes('\n') || node.nodeValue?.includes('\\n')) nodes.push(node as Text);
      }
      nodes.forEach(textNode => {
        textNode.nodeValue = (textNode.nodeValue || '').replace(/(?:\n|\\n)/g, ' ');
      });
    };
    clean();
    const observer = new MutationObserver(clean);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  async function load() {
    setLoading(true);
    setLoadTimedOut(false);
    let timeoutId: number | undefined;
    try {
      const result = await Promise.race([
        api.get('/api/study'),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            setLoadTimedOut(true);
            reject(new Error('StudyFlow is taking longer than expected. Check your connection and retry.'));
          }, 12000);
        }),
      ]);
      setPrograms(result.data.programs || []);
      setCourses(result.data.courses || []);
      setAssignments(result.data.assignments || []);
      setExams(result.data.exams || []);
      setSubmissions(result.data.submissions || []);
      setResults(result.data.results || []);
      setUsers(result.data.users || []);
      setAttendance(result.data.attendance || []);
      setExcuses(result.data.excuses || []);
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      setLoading(false);
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    if (user) load().catch((err: any) => setError(err?.message || 'Unable to load StudyFlow data.'));
  }, [user]);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError('');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setLoginBusy(true);
    try {
      const result = await api.post('/api/auth/login', {
        studyflowId: data.studyflowId,
        password: data.password,
        role: loginRole,
      });
      if (result.data.user?.role !== loginRole) throw new Error('This account is not authorized for this portal.');
      setUser(result.data.user);
      localStorage.setItem('studyflow_user', JSON.stringify(result.data.user));
      setLoginRole(null);
      setActive('dashboard');
    } catch (err: any) {
      setLoginError(!navigator.onLine ? 'You appear to be offline. Reconnect and try again.' : err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoginBusy(false);
    }
  }

  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError('');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (String(data.password || '').length < 6) { setLoginError('Choose a password with at least 6 characters.'); return; }
    if (data.password !== data.confirmPassword) { setLoginError('The passwords do not match.'); return; }
    setLoginBusy(true);
    try {
      const result = await api.post('/api/auth/register', { name: String(data.name || '').trim(), password: data.password, role: loginRole });
      setRegisteredAccount(result.data.user);
      setLoginMode('login');
    } catch (err: any) { setLoginError(!navigator.onLine ? 'You appear to be offline. Reconnect and try again.' : err?.message || 'Could not create your account. Please try again.'); }
    finally { setLoginBusy(false); }
  }

  function logout() {
    localStorage.removeItem('studyflow_user');
    setUser(null);
    setLoginRole(null);
    setRegisteredAccount(null);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      await api.post('/api/study', { type: formType, data });
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

  async function updateItem(
    item: Item,
    type: string,
    changes: Record<string, any>
  ) {
    try {
      await api.put('/api/study/' + item.id, {
        type,
        data: { ...item, ...changes },
      });
      await load();
    } catch {
      setError('Could not update this item.');
    }
  }

  async function remove(item: Item, type: string) {
    if (!window.confirm('Delete this item? This cannot be undone.')) return;
    try {
      await api.delete('/api/study/' + item.id, { type });
      setNotice('Item deleted.');
      await load();
    } catch {
      setError('Could not delete this item.');
    }
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

  const nav =
    user?.role === 'admin'
      ? [['dashboard', 'Admin Dashboard'], ['users', 'Manage Users'], ['programs', 'Programs'], ['courses', 'Courses'], ['assignments', 'Assignments'], ['exams', 'Exams'], ['results', 'Student Results']]
      : user?.role === 'teacher'
      ? [['dashboard', 'Dashboard'], ['assignments', 'Assignments'], ['submissions', 'Submissions'], ['results', 'Student Results'], ['attendance', 'Attendance'], ['excuses', 'Excuses']]
      : [
            ['dashboard', 'Dashboard'],
            ['courses', 'Courses'],
            ['assignments', 'Assignments'],
            ['exams', 'Exams'],
            ['grades', 'My Grades'],
            ['results', 'My Results'],
            ['attendance', 'Attendance'],
            ['excuses', 'My Excuses'],
          ];

  if (user && initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100" role="status" aria-live="polite">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-950/40"><GraduationCap size={34} /></div>
          <h1 className="text-3xl font-bold tracking-tight">StudyFlow</h1>
          <div className="mt-6 flex items-center gap-3 text-sm text-slate-300"><LoaderCircle size={20} className="animate-spin text-indigo-400" /> Preparing your dashboard…</div>
          <p className="mt-2 text-center text-sm text-slate-500">Loading your courses, assignments and academic records.</p>
          {!isOnline && <p className="mt-5 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"><WifiOff size={17} /> You are offline. Reconnect to load your dashboard.</p>}
          <div className="mt-10 grid w-full gap-4 sm:grid-cols-3">
            {[1, 2, 3].map(card => <div key={card} className="h-28 animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="h-3 w-20 rounded bg-slate-800"/><div className="mt-5 h-7 w-14 rounded bg-slate-800"/><div className="mt-3 h-2 w-full rounded bg-slate-800"/></div>)}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (window.location.hash === '#admin') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#101a31] px-5 py-10 text-white">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-300 text-[#101a31]"><ShieldCheck size={32} /></div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">Restricted access</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">StudyFlow Administration</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">Authorized administrators only. Sign in to open the control center.</p>
            </div>
            <form onSubmit={login} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 sm:p-8">
              {!isOnline && <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200"><WifiOff size={16} /> You are offline. Sign-in requests may fail.</div>}
              {loginError && <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{loginError}</div>}
              <label className="block text-sm font-medium text-slate-200">Administrator ID<input name="studyflowId" type="text" required autoComplete="username" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1224] p-3.5 text-white outline-none transition focus:border-cyan-300" placeholder="Enter administrator ID" /></label>
              <label className="mt-5 block text-sm font-medium text-slate-200">Password<input name="password" type="password" required autoComplete="current-password" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1224] p-3.5 text-white outline-none transition focus:border-cyan-300" placeholder="Enter administrator password" /></label>
              <button type="submit" disabled={loginBusy || !isOnline} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 py-3.5 font-bold text-[#101a31] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">{loginBusy && <LoaderCircle size={18} className="animate-spin" />}{loginBusy ? 'Signing in…' : 'Access admin console'}</button>
              <p className="mt-5 text-center text-xs leading-5 text-slate-400">This sign-in is separate from the student and teacher portal.</p>
            </form>
            <button onClick={() => { window.location.hash = ''; }} className="mt-6 flex w-full items-center justify-center gap-2 text-sm text-slate-300 transition hover:text-white"><ChevronRight size={16} className="rotate-180" /> Return to StudyFlow home</button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-950 px-5 py-10 text-slate-100">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500">
              <GraduationCap size={34} />
            </div>
            <h1 className="text-4xl font-bold">StudyFlow</h1>
            <p className="mt-2 text-slate-400">
              Choose your account type to continue
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {roleCards.map(card => {
              const Icon = card.icon;
              return (
                <button
                  key={card.role}
                  onClick={() => {
                    setLoginRole(card.role);
                    setLoginMode('login');
                    setLoginError('');
                    setRegisteredAccount(null);
                  }}
                  className="rounded-3xl border border-slate-800 bg-slate-900 p-7 text-left transition hover:-translate-y-1 hover:border-indigo-500"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
                    <Icon size={28} />
                  </div>
                  <h2 className="text-xl font-bold">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {card.text}
                  </p>
                  <span className="mt-6 inline-block rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold">
                    Continue
                  </span>
                </button>
              );
            })}
          </div>
          {loginRole && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
              <form
                onSubmit={loginMode === 'signup' ? register : login}
                className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-7"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-400">StudyFlow</p>
                    <h2 className="text-2xl font-bold">
                      {loginRole[0].toUpperCase() + loginRole.slice(1)} {loginMode === 'signup' && loginRole !== 'admin' ? 'Sign Up' : 'Login'}
                    </h2>
                  </div>
                  <button type="button" onClick={() => setLoginRole(null)}>
                    <X />
                  </button>
                </div>
                {registeredAccount && (
                  <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    <p className="font-semibold">Registration successful!</p><p className="mt-2">Your StudyFlow ID is:</p>
                    <p className="my-2 text-2xl font-bold tracking-wide">{registeredAccount.studyflowId}</p>
                    <p>Save this ID. You will need it with your password to log in.</p>
                    <button type="button" onClick={() => { setLoginMode('login'); setLoginError(''); }} className="mt-3 font-semibold underline">Continue to login</button>
                  </div>
                )}
                {!isOnline && <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200"><WifiOff size={16} /> You are offline. Reconnect before continuing.</div>}
                {loginError && <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{loginError}</div>}
                {loginMode === 'signup' && loginRole !== 'admin' && <label className="mb-4 block text-sm text-slate-400">Full name<input name="name" type="text" required autoComplete="name" className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none" placeholder="Enter your full name" /></label>}
                {loginMode === 'login' && <label className="text-sm text-slate-400">StudyFlow ID<input name="studyflowId" type="text" required autoComplete="username" className="mt-2 w-full rounded-xl bg-slate-800 p-3 uppercase outline-none" placeholder={loginRole === 'student' ? 'STU-001' : loginRole === 'teacher' ? 'TCH-001' : 'ADM-001'} /></label>}
                <label className="mt-4 block text-sm text-slate-400">Password<input name="password" type="password" required autoComplete={loginMode === 'signup' ? 'new-password' : 'current-password'} className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none" placeholder={loginMode === 'signup' ? 'Create a password (6+ characters)' : 'Enter password'} minLength={loginMode === 'signup' ? 6 : undefined} /></label>
                {loginMode === 'signup' && <label className="mt-4 block text-sm text-slate-400">Confirm password<input name="confirmPassword" type="password" required autoComplete="new-password" className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none" placeholder="Re-enter your password" minLength={6} /></label>}
                <button type="submit" disabled={loginBusy || !isOnline} onClick={() => setRegisteredAccount(null)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-60">{loginBusy && <LoaderCircle size={18} className="animate-spin" />}{loginBusy ? (loginMode === 'signup' ? 'Creating account…' : 'Signing in…') : (loginMode === 'signup' ? 'Create Account' : 'Login')}</button>
                {loginRole !== 'admin' && <p className="mt-4 text-center text-sm text-slate-400">{loginMode === 'login' ? "Don't have an account? " : 'Already have an account? '}<button type="button" onClick={() => { setLoginMode(loginMode === 'login' ? 'signup' : 'login'); setLoginError(''); setRegisteredAccount(null); }} className="font-semibold text-indigo-300 underline">{loginMode === 'login' ? 'Sign Up' : 'Login'}</button></p>}
                <p className="mt-3 text-center text-xs text-slate-500">No email needed. Your StudyFlow ID and password are your login details.</p>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  const openForm = (type: string) => {
    setFormType(type);
    setShowForm(true);
    setError('');
  };

  return (
    <div className={user.role === 'admin' ? 'admin-portal min-h-screen bg-[#f4f7fb] text-slate-900' : 'min-h-screen bg-slate-950 text-slate-100'}>
      {!isOnline && <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 shadow-lg"><WifiOff size={16} /> Connection lost. Changes may not save until you reconnect.</div>}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 p-5 transition-transform md:translate-x-0 ${user.role === 'admin' ? 'border-r border-white/10 bg-[#111c35] text-white shadow-2xl shadow-slate-900/10' : 'border-r border-slate-800 bg-slate-900'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-8 flex items-center gap-3">
          <div className={`rounded-xl p-2 ${user.role === 'admin' ? 'bg-cyan-300 text-[#111c35]' : 'bg-indigo-500'}`}>
            {user.role === 'admin' ? <ShieldCheck size={22} /> : <GraduationCap size={22} />}
          </div>
          <div>
            <h1 className="font-bold tracking-tight">StudyFlow</h1>
            <p className={`text-xs capitalize ${user.role === 'admin' ? 'text-cyan-200' : 'text-slate-400'}`}>{user.role === 'admin' ? 'Administration console' : `${user.role} portal`}</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="space-y-2">
          {nav.map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setActive(id);
                setMobileOpen(false);
              }}
              className={`w-full rounded-xl px-4 py-3 text-left transition ${user.role === 'admin' ? (active === id ? 'bg-cyan-300 font-semibold text-[#111c35] shadow-lg shadow-cyan-950/10' : 'text-slate-300 hover:bg-white/10') : (active === id ? 'bg-indigo-500' : 'text-slate-400 hover:bg-slate-800')}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className={`absolute bottom-5 left-5 right-5 rounded-2xl p-4 ${user.role === 'admin' ? 'border border-white/10 bg-white/5' : 'bg-slate-800/70'}`}>
          <p className="font-semibold">{user.name}</p>
          <p className={`text-xs ${user.role === 'admin' ? 'text-slate-400' : 'text-slate-400'}`}>{user.studyflowId || user.email || 'Signed in'}</p>
          <button
            onClick={logout}
            className="mt-3 flex items-center gap-2 text-sm text-red-300"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <main className="md:ml-64">
        <header className={`sticky top-0 z-30 border-b px-4 py-3 backdrop-blur sm:px-6 ${user.role === 'admin' ? 'border-slate-200 bg-white/95 shadow-sm shadow-slate-900/[0.02]' : 'border-slate-800 bg-slate-950/90'}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-800 p-2 md:hidden"
              >
                <Menu size={19} />
              </button>
              <p className={`text-sm ${user.role === 'admin' ? 'text-slate-500' : 'text-indigo-400'}`}>{user.role === 'admin' ? 'ADMINISTRATOR WORKSPACE' : `Welcome, ${user.name}`}</p>
              <h2 className="text-xl font-bold">
                {nav.find(n => n[0] === active)?.[1]}
              </h2>
            </div>
            {user.role === 'teacher' && active === 'assignments' && (
              <button
                onClick={() => openForm('assignment')}
                className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 font-semibold"
              >
                <Plus size={18} /> Add
              </button>
            )}
          </div>
        </header>

        <div className={`mx-auto p-5 md:p-8 ${user.role === 'admin' ? 'max-w-[1440px]' : 'max-w-6xl'}`}>
          {error && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              <span className="flex items-center gap-2">
                <AlertCircle size={17} />
                {error}
              </span>
              <div className="flex items-center gap-3">
                {(loadTimedOut || error.includes('load StudyFlow data') || !isOnline) && <button onClick={() => load().catch((err: any) => setError(err?.message || 'Unable to load StudyFlow data.'))} disabled={!isOnline || loading} className="flex items-center gap-1 font-semibold text-red-200 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Retry</button>}
                <button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button>
              </div>
            </div>
          )}
          {notice && (
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {notice}
            </div>
          )}
          {loading && (
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-slate-900">
              <div className="h-full w-1/3 animate-pulse bg-indigo-500" />
            </div>
          )}

          {active === 'dashboard' && user.role === 'admin' && (
            <AdminDashboard user={user} users={users} programs={programs} courses={courses} assignments={assignments} exams={exams} submissions={submissions} setActive={setActive} />
          )}

          {active === 'dashboard' && user.role !== 'admin' && (
            <Dashboard
              user={user}
              courses={user.role === 'student' ? studentCourses : courses}
              assignments={
                user.role === 'student'
                  ? studentAssignments
                  : teacherAssignments
              }
              submissions={submissions}
              attendance={attendance}
              users={users}
              setActive={setActive}
            />
          )}

          {active === 'users' && user.role === 'admin' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <AdminMetric icon={GraduationCap} label="Students" value={users.filter(u => u.role === 'student').length} note="Student accounts" />
                <AdminMetric icon={BookOpen} label="Teachers" value={users.filter(u => u.role === 'teacher').length} note="Teaching accounts" />
                <AdminMetric icon={Users} label="All accounts" value={users.length} note="Across StudyFlow" />
              </div>
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h3 className="font-bold text-slate-900">User directory</h3><p className="mt-1 text-sm text-slate-500">Accounts currently registered in StudyFlow</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{users.length} accounts</span></div>
                {users.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Name</th><th className="px-5 py-3 font-semibold">StudyFlow ID</th><th className="px-5 py-3 font-semibold">Role</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map(account => <tr key={account.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800">{account.name || 'Unnamed user'}</td><td className="px-5 py-4 font-mono text-xs text-slate-500">{account.studyflowId || 'No ID'}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{account.role}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${account.disabled ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{account.disabled ? 'Disabled' : 'Active'}</span></td></tr>)}</tbody></table></div> : <p className="p-6 text-sm text-slate-500">No accounts have been registered yet.</p>}
              </section>
            </div>
          )}

          {active === 'programs' && (
            <List
              title="Programs"
              items={programs}
              extra={p =>
                `${courses.filter(c => c.programId === p.id).length} courses`
              }
              onDelete={x => remove(x, 'program')}
            />
          )}
          {active === 'courses' && (
            <List
              title="Courses"
              items={user.role === 'student' ? studentCourses : courses}
              extra={c =>
                programs.find(p => p.id === c.programId)?.name || 'No program'
              }
              onDelete={x => remove(x, 'course')}
            />
          )}

          {active === 'assignments' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="mb-4 font-bold">
                {user.role === 'student'
                  ? 'Your assignments'
                  : 'Assignments you teach'}
              </h3>
              <div className="space-y-3">
                {(user.role === 'student'
                  ? studentAssignments
                  : teacherAssignments
                ).map(a => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl bg-slate-800/60 p-4"
                  >
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-slate-400">
                        {courses.find(c => c.id === a.courseId)?.name ||
                          'Course'}{' '}
                        · Due {a.dueDate || 'No date'}
                      </p>
                    </div>
                    {user.role === 'student' ? (
                      <button
                        disabled={submissions.some(
                          s =>
                            s.assignmentId === a.id && s.studentId === user.id
                        )}
                        onClick={() => setShowSubmit(a)}
                        className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold disabled:bg-slate-700"
                      >
                        {submissions.some(
                          s =>
                            s.assignmentId === a.id && s.studentId === user.id
                        )
                          ? 'Submitted'
                          : 'Submit Work'}
                      </button>
                    ) : (
                      <button
                        onClick={() => remove(a, 'assignment')}
                        className="text-sm text-red-300"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'submissions' && user.role === 'teacher' && (
            <div className="space-y-3">
              {submissions
                .filter(s => s.teacherId === user.id || !s.teacherId)
                .map(s => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-bold">
                          {s.studentName || 'Student'}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {s.assignmentTitle || 'Assignment'} ·{' '}
                          {s.courseName || ''}
                        </p>
                      </div>
                      <span className="text-indigo-300">
                        {s.grade != null ? `${s.grade}%` : 'Pending'}
                      </span>
                    </div>
                    <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-300">
                      {s.code || s.content || 'No code submitted.'}
                    </pre>
                    <button
                      onClick={() => setShowGrade(s)}
                      className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold"
                    >
                      {s.grade != null ? 'Update grade' : 'Assess submission'}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {active === 'grades' && user.role === 'student' && (
            <div className="grid gap-4">
              {studentAssignments.map(a => {
                const s = submissions.find(
                  x => x.assignmentId === a.id && x.studentId === user.id
                );
                return (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <div className="flex justify-between">
                      <span>{a.title}</span>
                      <b>{s?.grade != null ? s.grade + '%' : 'Not graded'}</b>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {s?.feedback || 'Awaiting teacher assessment.'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {active === 'attendance' && (
            <Attendance
              attendance={attendance}
              user={user}
              courses={courses}
              onSave={async data => {
                await api.post('/api/study', { type: 'attendance', data });
                await load();
              }}
            />
          )}

          {active === 'excuses' && (
            <Excuses
              excuses={excuses}
              user={user}
              onSave={async data => {
                await api.post('/api/study', { type: 'excuse', data });
                await load();
              }}
              onUpdate={updateItem}
            />
          )}

          {active === 'exams' && (
            <List
              title="Exams"
              items={exams}
              extra={e =>
                courses.find(c => c.id === e.courseId)?.name || 'Course'
              }
              onDelete={x => remove(x, 'exam')}
            />
          )}

          {active === 'results' && (
            <ResultsPanel
              user={user}
              results={results}
              users={users}
              courses={courses}
              onSave={async data => {
                await api.post('/api/study', { type: 'results', data });
                setNotice('Result saved as a draft for administrator review.');
                await load();
              }}
              onUpdate={async (item, changes) => {
                await updateItem(item, 'results', changes);
                setNotice(changes.status === 'Published' ? 'Result published to the student.' : 'Result updated.');
              }}
            />
          )}
        </div>
      </main>

      {showSubmit && (
        <SubmitModal
          assignment={showSubmit}
          onClose={() => setShowSubmit(null)}
          onSubmit={(code: string) => submitAssignment(showSubmit, code)}
        />
      )}
      {showGrade && (
        <GradeModal
          submission={showGrade}
          onClose={() => setShowGrade(null)}
          onSubmit={async (grade: number, feedback: string) => {
            await updateItem(showGrade, 'submission', { grade, feedback });
            setShowGrade(null);
          }}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={save}
            className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold">Add {formType}</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X />
              </button>
            </div>
            {formType === 'program' && (
              <Field name="name" label="Program name" />
            )}
            {formType === 'course' && (
              <>
                <Field name="name" label="Course name" />
                <label className="mt-4 block text-sm text-slate-400">
                  Program
                  <select
                    name="programId"
                    className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                  >
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {formType === 'assignment' && (
              <>
                <Field name="title" label="Assignment title" />
                <Field name="instructions" label="Instructions" />
                <label className="mt-4 block text-sm text-slate-400">
                  Course
                  <select
                    name="courseId"
                    className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field name="dueDate" label="Due date" type="date" />
                <input type="hidden" name="teacherId" value={user.id} />
              </>
            )}
            <button className="mt-6 w-full rounded-xl bg-indigo-500 py-3 font-semibold">
              Save
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ResultsPanel({ user, results, users, courses, onSave, onUpdate }: { user: Item; results: Item[]; users: Item[]; courses: Item[]; onSave: (data: Item) => Promise<void>; onUpdate: (item: Item, changes: Record<string, any>) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const students = users.filter(account => account.role === 'student' && !account.disabled);
  const visibleResults = user.role === 'student'
    ? results.filter(result => result.studentId === user.id && result.status === 'Published')
    : results;
  const gradeFor = (total: number) => total >= 70 ? 'A' : total >= 60 ? 'B' : total >= 50 ? 'C' : total >= 45 ? 'D' : 'F';

  async function submitResult(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      const caScore = Number(values.caScore);
      const examScore = Number(values.examScore);
      if (!Number.isFinite(caScore) || caScore < 0 || caScore > 40 || !Number.isFinite(examScore) || examScore < 0 || examScore > 60) {
        window.alert('CA marks must be between 0 and 40, and exam marks between 0 and 60.');
        return;
      }
      const student = students.find(item => item.id === values.studentId);
      const course = courses.find(item => item.id === values.courseId);
      if (!student || !course) {
        window.alert('Choose a valid student and course.');
        return;
      }
      const total = caScore + examScore;
      await onSave({
        studentId: student.id,
        studentName: student.name,
        studyflowId: student.studyflowId,
        courseId: course.id,
        courseName: course.name,
        teacherId: user.id,
        assessmentName: String(values.assessmentName || '').trim(),
        semester: String(values.semester || ''),
        academicYear: String(values.academicYear || '').trim(),
        caScore,
        examScore,
        total,
        grade: gradeFor(total),
        status: 'Draft',
        createdAt: new Date().toISOString()
      });
      event.currentTarget.reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-3"><div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300"><Award size={22} /></div><div><h2 className="text-xl font-bold">{user.role === 'student' ? 'My Academic Results' : 'Student Results'}</h2><p className="mt-1 text-sm text-slate-400">Continuous assessment (40) + examination (60) = total out of 100.</p></div></div>
        {user.role === 'teacher' && (
          <form onSubmit={submitResult} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-slate-300">Student<select name="studentId" required className="mt-2 w-full rounded-xl bg-slate-800 p-3">{students.map(student => <option key={student.id} value={student.id}>{student.name} ({student.studyflowId})</option>)}</select></label>
            <label className="text-sm text-slate-300">Course<select name="courseId" required className="mt-2 w-full rounded-xl bg-slate-800 p-3">{courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
            <label className="text-sm text-slate-300">Assessment / exam name<input name="assessmentName" required maxLength={100} placeholder="e.g. First Semester Examination" className="mt-2 w-full rounded-xl bg-slate-800 p-3" /></label>
            <label className="text-sm text-slate-300">Semester<select name="semester" required className="mt-2 w-full rounded-xl bg-slate-800 p-3"><option>First Semester</option><option>Second Semester</option><option>Summer Semester</option></select></label>
            <label className="text-sm text-slate-300">Academic year<input name="academicYear" required defaultValue="2026/2027" pattern="[0-9]{4}/[0-9]{4}" className="mt-2 w-full rounded-xl bg-slate-800 p-3" /></label>
            <label className="text-sm text-slate-300">CA mark (0–40)<input name="caScore" type="number" required min="0" max="40" step="0.5" defaultValue="0" className="mt-2 w-full rounded-xl bg-slate-800 p-3" /></label>
            <label className="text-sm text-slate-300">Exam mark (0–60)<input name="examScore" type="number" required min="0" max="60" step="0.5" defaultValue="0" className="mt-2 w-full rounded-xl bg-slate-800 p-3" /></label>
            <div className="flex items-end"><button disabled={saving || students.length === 0 || courses.length === 0} className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Save result draft'}</button></div>
            <p className="text-xs leading-5 text-slate-400 sm:col-span-2 lg:col-span-3">New marks are saved as drafts. An administrator must publish a result before the student can see it. Grade bands: A ≥ 70, B ≥ 60, C ≥ 50, D ≥ 45, F below 45.</p>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h3 className="font-bold">{user.role === 'student' ? 'Published results' : 'Results register'}</h3><p className="mt-1 text-sm text-slate-400">{visibleResults.length} result{visibleResults.length === 1 ? '' : 's'}</p></div><button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">Print results</button></div>
        {visibleResults.length === 0 ? <div className="p-8 text-center"><Award className="mx-auto mb-3 text-slate-500" size={30} /><p className="font-semibold">{user.role === 'student' ? 'No published results yet' : 'No results have been entered yet'}</p><p className="mt-2 text-sm text-slate-400">{user.role === 'student' ? 'Your results will appear here after your school publishes them.' : 'Enter a student’s marks above to create the first result draft.'}</p></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-800/70 text-xs uppercase tracking-wide text-slate-300"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Course / assessment</th><th className="px-4 py-3">Semester</th><th className="px-4 py-3">CA / 40</th><th className="px-4 py-3">Exam / 60</th><th className="px-4 py-3">Total / 100</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Status</th>{user.role === 'admin' && <th className="px-4 py-3">Action</th>}</tr></thead><tbody className="divide-y divide-slate-800">{[...visibleResults].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(result => <tr key={result.id} className="align-top"><td className="px-4 py-4"><p className="font-semibold">{result.studentName}</p><p className="mt-1 text-xs text-slate-400">{result.studyflowId}</p></td><td className="px-4 py-4"><p className="font-semibold">{result.courseName}</p><p className="mt-1 text-xs text-slate-400">{result.assessmentName}</p><p className="mt-1 text-xs text-slate-500">{result.academicYear}</p></td><td className="px-4 py-4">{result.semester}</td><td className="px-4 py-4">{result.caScore}</td><td className="px-4 py-4">{result.examScore}</td><td className="px-4 py-4 font-bold">{result.total}%</td><td className="px-4 py-4"><span className="rounded-lg bg-indigo-500/15 px-2 py-1 font-bold text-indigo-300">{result.grade}</span></td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${result.status === 'Published' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{result.status || 'Draft'}</span></td>{user.role === 'admin' && <td className="px-4 py-4"><button type="button" onClick={() => onUpdate(result, { status: result.status === 'Published' ? 'Draft' : 'Published', publishedAt: result.status === 'Published' ? null : new Date().toISOString() })} className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold">{result.status === 'Published' ? 'Unpublish' : 'Publish'}</button></td>}</tr>)}</tbody></table></div>
        )}
      </section>
    </div>
  );
}

function AdminMetric({ icon: Icon, label, value, note }: { icon: any; label: string; value: any; note: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{note}</p></div><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Icon size={21} /></div></div></div>;
}

function AdminDashboard({ user, users, programs, courses, assignments, exams, submissions, setActive }: { user: Item; users: Item[]; programs: Item[]; courses: Item[]; assignments: Item[]; exams: Item[]; submissions: Item[]; setActive: (id: string) => void }) {
  const studentCount = users.filter(u => u.role === 'student').length;
  const teacherCount = users.filter(u => u.role === 'teacher').length;
  const recentUsers = [...users].slice(-5).reverse();
  const actions = [
    { id: 'users', title: 'Manage users', detail: 'Review student and teacher accounts', icon: Users, tint: 'bg-blue-50 text-blue-700' },
    { id: 'programs', title: 'Academic programs', detail: 'Organize programs and departments', icon: BookMarked, tint: 'bg-violet-50 text-violet-700' },
    { id: 'courses', title: 'Course catalogue', detail: 'Review courses in the system', icon: BookOpen, tint: 'bg-emerald-50 text-emerald-700' },
    { id: 'exams', title: 'Exam management', detail: 'View exam records and schedules', icon: CalendarDays, tint: 'bg-amber-50 text-amber-700' },
  ];
  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#142342] via-[#1c3965] to-[#176b82] p-6 text-white shadow-lg shadow-blue-950/10 md:p-8">
      <div className="relative z-10 max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100"><ShieldCheck size={14} /> ADMIN CONTROL CENTER</div><h3 className="text-2xl font-bold tracking-tight md:text-3xl">Good day, {user.name || 'Administrator'}</h3><p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">Your overview of StudyFlow. Manage people, academic structure and learning activity from one dedicated workspace.</p></div>
      <div className="pointer-events-none absolute -right-8 -top-16 h-64 w-64 rounded-full border-[28px] border-white/5"/><div className="pointer-events-none absolute -bottom-28 right-28 h-64 w-64 rounded-full border-[35px] border-cyan-200/10"/>
    </section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetric icon={Users} label="Total accounts" value={users.length} note="All registered profiles" />
      <AdminMetric icon={GraduationCap} label="Students" value={studentCount} note="Learner accounts" />
      <AdminMetric icon={BookOpen} label="Teachers" value={teacherCount} note="Teaching staff accounts" />
      <AdminMetric icon={Activity} label="Learning records" value={assignments.length + submissions.length + exams.length} note="Assignments, submissions and exams" />
    </section>
    <section className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Administration shortcuts</h3><p className="mt-1 text-sm text-slate-500">Jump straight to a workspace</p></div><LayoutDashboard className="text-slate-400" size={20}/></div><div className="grid gap-3 sm:grid-cols-2">{actions.map(action => { const Icon = action.icon; return <button key={action.id} onClick={() => setActive(action.id)} className="group flex items-start gap-3 rounded-xl border border-slate-100 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40"><span className={`rounded-xl p-3 ${action.tint}`}><Icon size={20}/></span><span className="min-w-0"><span className="block font-semibold text-slate-800">{action.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{action.detail}</span></span><ChevronRight size={16} className="ml-auto mt-1 shrink-0 text-slate-300 transition group-hover:text-blue-600"/></button>})}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Academic overview</h3><p className="mt-1 text-sm text-slate-500">Current content totals</p></div><BookMarked className="text-slate-400" size={20}/></div><div className="space-y-4">{[{ label: 'Programs', value: programs.length, color: 'bg-violet-500' }, { label: 'Courses', value: courses.length, color: 'bg-blue-500' }, { label: 'Assignments', value: assignments.length, color: 'bg-emerald-500' }, { label: 'Exams', value: exams.length, color: 'bg-amber-500' }].map(row => <div key={row.label}><div className="mb-2 flex items-center justify-between text-sm"><span className="text-slate-600">{row.label}</span><span className="font-bold text-slate-900">{row.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.min(100, row.value * 10)}%` }}/></div></div>)}</div></div>
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h3 className="font-bold text-slate-900">Recently registered accounts</h3><p className="mt-1 text-sm text-slate-500">A quick look at the latest accounts in the directory</p></div><button onClick={() => setActive('users')} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">View all users <ChevronRight size={15} className="ml-1 inline"/></button></div>{recentUsers.length ? <div className="divide-y divide-slate-100">{recentUsers.map(account => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">{(account.name || 'U').slice(0,1).toUpperCase()}</div><div><p className="font-semibold text-slate-800">{account.name || 'Unnamed user'}</p><p className="mt-1 text-xs text-slate-500">{account.studyflowId || 'No StudyFlow ID'}</p></div></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">{account.role}</span></div>)}</div> : <p className="p-5 text-sm text-slate-500">No user accounts are available yet.</p>}</section>
  </div>;
}

function Dashboard({
  user,
  courses,
  assignments,
  submissions,
  attendance,
  users,
  setActive,
}: any) {
  const graded = submissions.filter((s: any) => s.grade != null);
  const avg = graded.length
    ? Math.round(
        graded.reduce((n: number, s: any) => n + Number(s.grade), 0) /
          graded.length
      )
    : 0;
  const mine =
    user.role === 'student'
      ? attendance.filter((a: any) => a.studentId === user.id)
      : attendance;
  const rate = mine.length
    ? Math.round(
        (mine.filter((a: any) => a.status === 'Present').length / mine.length) *
          100
      )
    : 0;
  const stats =
    user.role === 'student'
      ? [
          [BookOpen, 'My Courses', courses.length],
          [ClipboardList, 'Assignments', assignments.length],
          [Award, 'Average Grade', graded.length ? avg + '%' : '—'],
          [CheckCircle2, 'Attendance', mine.length ? rate + '%' : '—'],
        ]
      : user.role === 'teacher'
        ? [
            [ClipboardList, 'Assignments', assignments.length],
            [Send, 'Submissions', submissions.length],
            [BookOpen, 'Courses', courses.length],
            [CheckCircle2, 'Attendance', attendance.length],
          ]
        : [
            [BookOpen, 'Courses', courses.length],
            [ClipboardList, 'Assignments', assignments.length],
            [CheckCircle2, 'Attendance', attendance.length],
          ];
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-indigo-600/20 via-slate-900 to-slate-900 p-6 sm:p-8">
        <p className="text-sm font-semibold text-indigo-300">
          Academic overview
        </p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
          {user.role === 'student'
            ? 'Keep your learning moving.'
            : 'Stay on top of school activity.'}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Your important academic activity is organized here so you can quickly
          see what needs attention.
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([Icon, label, value]: any) => (
          <Stat key={label} icon={Icon} label={label} value={value} />
        ))}
      </div>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold">Recent assignments</h3>
            <p className="text-xs text-slate-500">Your latest academic work</p>
          </div>
          <button
            onClick={() => setActive('assignments')}
            className="text-sm font-semibold text-indigo-300"
          >
            View all
          </button>
        </div>
        {assignments.slice(0, 5).map((a: any) => (
          <div
            key={a.id}
            className="mb-2 flex items-center justify-between rounded-xl bg-slate-800/50 p-3.5"
          >
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {courses.find((c: any) => c.id === a.courseId)?.name ||
                  'Course'}{' '}
                · Due {a.dueDate || 'No date'}
              </p>
            </div>
            <ChevronRight size={16} className="text-slate-600" />
          </div>
        ))}
      </section>
    </div>
  );
}
function SubmitModal({ assignment, onClose, onSubmit }: any) {
  const [code, setCode] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold">Submit: {assignment.title}</h3>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          Paste your completed code below.
        </p>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          rows={15}
          className="w-full rounded-xl bg-slate-950 p-4 font-mono text-xs outline-none"
          placeholder="Paste your code here..."
        />
        <button
          disabled={!code.trim()}
          onClick={() => onSubmit(code)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-3 font-semibold disabled:bg-slate-700"
        >
          <Send size={17} /> Submit assignment
        </button>
      </div>
    </div>
  );
}
function GradeModal({ submission, onClose, onSubmit }: any) {
  const [grade, setGrade] = useState(submission.grade?.toString() || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold">Assess submission</h3>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <p className="text-sm text-slate-400">
          {submission.studentName} · {submission.assignmentTitle}
        </p>
        <label className="mt-5 block text-sm text-slate-400">
          Grade (0–100)
          <input
            type="number"
            min="0"
            max="100"
            value={grade}
            onChange={e => setGrade(e.target.value)}
            className="mt-2 w-full rounded-xl bg-slate-800 p-3"
          />
        </label>
        <label className="mt-4 block text-sm text-slate-400">
          Feedback
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={5}
            className="mt-2 w-full rounded-xl bg-slate-800 p-3"
          />
        </label>
        <button
          onClick={() =>
            onSubmit(Math.max(0, Math.min(100, Number(grade))), feedback)
          }
          className="mt-5 w-full rounded-xl bg-indigo-500 py-3 font-semibold"
        >
          Save assessment
        </button>
      </div>
    </div>
  );
}
function Field({
  name,
  label,
  type = 'text',
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <label className="mt-4 block text-sm text-slate-400">
      {label}
      <input
        name={name}
        type={type}
        required={name !== 'instructions'}
        className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none"
      />
    </label>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: any;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <Icon className="mb-4 text-indigo-400" />
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
function List({
  title,
  items,
  extra,
  onDelete,
  actionLabel,
}: {
  title: string;
  items: Item[];
  extra: (i: Item) => string;
  onDelete?: (i: Item) => void;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-4 font-bold">{title}</h3>
      {items.length ? (
        <div className="space-y-3">
          {items.map(i => (
            <div
              key={i.id}
              className="flex items-center justify-between rounded-xl bg-slate-800/60 p-4"
            >
              <div>
                <p className="font-medium">{i.name || i.title}</p>
                <p className="text-xs text-slate-400">{extra(i)}</p>
              </div>
              {onDelete && (
                <button
                  onClick={() => onDelete(i)}
                  className="text-sm text-indigo-300"
                >
                  {actionLabel || 'Delete'}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400">Nothing here yet.</p>
      )}
    </div>
  );
}
function Attendance({
  attendance,
  user,
  courses,
  onSave,
}: {
  attendance: Item[];
  user: Item;
  courses: Item[];
  onSave: (d: Item) => Promise<void>;
}) {
  const mine =
    user.role === 'student'
      ? attendance.filter(a => a.studentId === user.id)
      : attendance;
  const eligible = (courseId: string) => {
    const rows = mine.filter(a => a.courseId === courseId);
    if (!rows.length) return true;
    const score =
      (rows.reduce(
        (n, a) =>
          n + (a.status === 'Present' ? 1 : a.status === 'Late' ? 0.5 : 0),
        0
      ) /
        rows.length) *
      100;
    return score >= 80;
  };
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-4 font-bold">Attendance & Exam Eligibility</h3>
      {user.role !== 'student' && (
        <form
          onSubmit={async e => {
            e.preventDefault();
            const d = Object.fromEntries(
              new FormData(e.currentTarget).entries()
            );
            await onSave({ ...d, teacherId: user.id });
            e.currentTarget.reset();
          }}
          className="mb-6 grid gap-3 md:grid-cols-4"
        >
          <input
            name="studentName"
            placeholder="Student name"
            className="rounded-xl bg-slate-800 p-3"
          />
          <select name="courseId" className="rounded-xl bg-slate-800 p-3">
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="status" className="rounded-xl bg-slate-800 p-3">
            <option>Present</option>
            <option>Late</option>
            <option>Absent</option>
          </select>
          <button className="rounded-xl bg-indigo-500 p-3 font-semibold">
            Record
          </button>
        </form>
      )}
      {courses.map(c => (
        <div
          key={c.id}
          className="mb-3 flex items-center justify-between rounded-xl bg-slate-800/60 p-4"
        >
          <span>{c.name}</span>
          <span
            className={eligible(c.id) ? 'text-emerald-300' : 'text-red-300'}
          >
            {eligible(c.id) ? 'Eligible (80%+)' : 'Not Eligible'}
          </span>
        </div>
      ))}
    </div>
  );
}
function Excuses({
  excuses,
  user,
  onSave,
  onUpdate,
}: {
  excuses: Item[];
  user: Item;
  onSave: (d: Item) => Promise<void>;
  onUpdate: (i: Item, t: string, c: Item) => Promise<void>;
}) {
  const mine =
    user.role === 'student'
      ? excuses.filter(x => x.studentId === user.id)
      : excuses;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-4 font-bold">
        {user.role === 'student'
          ? 'My Attendance Excuses'
          : 'Attendance Excuse Requests'}
      </h3>
      {user.role === 'student' && (
        <form
          onSubmit={async e => {
            e.preventDefault();
            const d = Object.fromEntries(
              new FormData(e.currentTarget).entries()
            );
            await onSave({ ...d, studentId: user.id, status: 'Pending' });
            e.currentTarget.reset();
          }}
          className="mb-6 flex gap-3"
        >
          <input
            name="reason"
            required
            placeholder="Reason for absence"
            className="flex-1 rounded-xl bg-slate-800 p-3"
          />
          <button className="rounded-xl bg-indigo-500 px-5 font-semibold">
            Submit
          </button>
        </form>
      )}
      {mine.map(x => (
        <div key={x.id} className="mb-3 rounded-xl bg-slate-800/60 p-4">
          <div className="flex justify-between">
            <span>{x.reason}</span>
            <b>{x.status || 'Pending'}</b>
          </div>
          {user.role !== 'student' && x.status === 'Pending' && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() =>
                  onUpdate(x, 'excuse', {
                    status: 'Approved',
                    teacherId: user.id,
                  })
                }
                className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-300"
              >
                Approve
              </button>
              <button
                onClick={() =>
                  onUpdate(x, 'excuse', {
                    status: 'Rejected',
                    teacherId: user.id,
                  })
                }
                className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default App;
