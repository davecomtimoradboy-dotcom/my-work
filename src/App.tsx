import { useEffect, useMemo, useState } from 'react';
import { api } from '@appdeploy/client';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react';

type Item = { id: string; [key: string]: any };

const nav = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'exams', label: 'Exams', icon: CalendarDays },
  { id: 'progress', label: 'Progress', icon: Target },
];

function App() {
  const [active, setActive] = useState('dashboard');
  const [courses, setCourses] = useState<Item[]>([]);
  const [assignments, setAssignments] = useState<Item[]>([]);
  const [exams, setExams] = useState<Item[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('assignment');
  const [error, setError] = useState('');

  async function load() {
    const result = await api.get('/api/study');
    setCourses(result.data.courses || []);
    setAssignments(result.data.assignments || []);
    setExams(result.data.exams || []);
  }

  useEffect(() => {
    load().catch(() => setError('Unable to load your study data.'));
  }, []);

  const completed = assignments.filter(a => a.completed).length;
  const progress = courses.length
    ? Math.round(
        courses.reduce((sum, c) => sum + Number(c.progress || 0), 0) /
          courses.length
      )
    : 0;
  const upcoming = assignments.filter(a => !a.completed).slice(0, 4);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!data.title && formType !== 'course')
      return setError('Please enter a title.');
    if (formType === 'course' && !data.name)
      return setError('Please enter a course name.');
    try {
      await api.post('/api/study', { type: formType, data });
      setShowForm(false);
      await load();
    } catch {
      setError('Could not save this item. Please try again.');
    }
  }

  async function toggleAssignment(item: Item) {
    await api.put('/api/study/' + item.id, {
      type: 'assignment',
      data: { ...item, completed: !item.completed },
    });
    load();
  }

  async function remove(item: Item, type: string) {
    await api.delete('/api/study/' + item.id, { type });
    load();
  }

  const openForm = (type: string) => {
    setFormType(type);
    setShowForm(true);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-800 bg-slate-900/95 p-5 md:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500 p-2">
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 className="font-bold">StudyFlow</h1>
            <p className="text-xs text-slate-400">Student planner</p>
          </div>
        </div>
        <nav className="space-y-2">
          {nav.map(n => {
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                onClick={() => setActive(n.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left ${active === n.id ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Icon size={18} />
                {n.label}
              </button>
            );
          })}
        </nav>
      </aside>
      <main className="md:ml-64">
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 px-5 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div>
              <p className="text-sm text-indigo-400">Good study session</p>
              <h2 className="text-xl font-bold">
                {nav.find(n => n.id === active)?.label}
              </h2>
            </div>
            <button
              onClick={() =>
                openForm(
                  active === 'courses'
                    ? 'course'
                    : active === 'exams'
                      ? 'exam'
                      : 'assignment'
                )
              }
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 font-semibold hover:bg-indigo-400"
            >
              <Plus size={18} /> Add
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-6xl p-5 md:p-8">
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {active === 'dashboard' && (
            <>
              <div className="mb-7">
                <h3 className="text-3xl font-bold">
                  Stay on top of your studies.
                </h3>
                <p className="mt-2 text-slate-400">
                  Track deadlines, exams, courses and your progress in one
                  place.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Courses', courses.length, BookOpen],
                  ['Assignments', assignments.length, ClipboardList],
                  ['Completed', completed, CheckCircle2],
                  ['Progress', progress + '%', Target],
                ].map(([label, value, Icon]: any) => (
                  <div
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                    key={label}
                  >
                    <Icon className="mb-4 text-indigo-400" />
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="mt-1 text-3xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold">Upcoming assignments</h3>
                  <button
                    onClick={() => setActive('assignments')}
                    className="text-sm text-indigo-400"
                  >
                    View all
                  </button>
                </div>
                {upcoming.length ? (
                  <div className="space-y-3">
                    {upcoming.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-xl bg-slate-800/60 p-4"
                      >
                        <div>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-xs text-slate-400">
                            {a.course || 'General'} · Due{' '}
                            {a.dueDate || 'No date'}
                          </p>
                        </div>
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                          Pending
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No pending assignments.</p>
                )}
              </section>
            </>
          )}
          {active === 'courses' && (
            <List
              title="Your courses"
              items={courses}
              type="course"
              onDelete={remove}
            />
          )}
          {active === 'assignments' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="mb-4 font-bold">Assignments</h3>
              <div className="space-y-3">
                {assignments.length ? (
                  assignments.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl bg-slate-800/60 p-4"
                    >
                      <button onClick={() => toggleAssignment(a)}>
                        <CheckCircle2
                          className={
                            a.completed ? 'text-emerald-400' : 'text-slate-600'
                          }
                        />
                      </button>
                      <div className="flex-1">
                        <p
                          className={
                            a.completed
                              ? 'text-slate-500 line-through'
                              : 'font-medium'
                          }
                        >
                          {a.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {a.course || 'General'} · Due {a.dueDate || 'No date'}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(a, 'assignment')}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">No assignments yet.</p>
                )}
              </div>
            </div>
          )}
          {active === 'exams' && (
            <List
              title="Upcoming exams"
              items={exams}
              type="exam"
              onDelete={remove}
            />
          )}
          {active === 'progress' && (
            <div className="grid gap-4">
              {courses.map(c => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">{c.name}</span>
                    <span>{c.progress || 0}%</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-slate-800">
                    <div
                      className="h-3 rounded-full bg-indigo-500"
                      style={{
                        width: `${Math.min(100, Number(c.progress || 0))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {!courses.length && (
                <p className="text-slate-400">
                  Add courses to start tracking progress.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
      {showForm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
          <form
            onSubmit={save}
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold">Add {formType}</h3>
              <button type="button" onClick={() => setShowForm(false)}>
                <X />
              </button>
            </div>
            {formType === 'course' ? (
              <>
                <label className="text-sm text-slate-400">
                  Course name
                  <input
                    name="name"
                    className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none"
                    placeholder="e.g. Web Development"
                  />
                </label>
                <label className="mt-4 block text-sm text-slate-400">
                  Progress (%)
                  <input
                    name="progress"
                    type="number"
                    min="0"
                    max="100"
                    className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none"
                    placeholder="0"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="text-sm text-slate-400">
                  Title
                  <input
                    name="title"
                    className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none"
                    placeholder="e.g. PHP Exam"
                  />
                </label>
                <label className="mt-4 block text-sm text-slate-400">
                  Course
                  <input
                    name="course"
                    className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none"
                    placeholder="e.g. PHP"
                  />
                </label>
                <label className="mt-4 block text-sm text-slate-400">
                  Date
                  <input
                    name={formType === 'exam' ? 'date' : 'dueDate'}
                    type="date"
                    className="mt-2 w-full rounded-xl bg-slate-800 p-3 outline-none"
                  />
                </label>
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

function List({
  title,
  items,
  type,
  onDelete,
}: {
  title: string;
  items: Item[];
  type: string;
  onDelete: (item: Item, type: string) => void;
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
                <p className="text-xs text-slate-400">
                  {i.progress != null
                    ? `${i.progress}% progress`
                    : i.date || 'No date'}
                </p>
              </div>
              <button
                onClick={() => onDelete(i, type)}
                className="text-slate-500 hover:text-red-400"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400">Nothing here yet.</p>
      )}
    </div>
  );
}

export default App;
