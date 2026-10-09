import { db, router, json, error, secrets } from '@appdeploy/sdk';

type RecordItem = Record<string, any> & { id: string };
const tables = ['users', 'programs', 'courses', 'assignments', 'exams', 'submissions', 'results', 'attendance', 'excuses'] as const;

async function list(table: string) {
  const result = await db.list(table, { limit: 100 });
  return result.items as RecordItem[];
}

async function seed() {
  let programs = await list('programs');
  let programId = programs[0]?.id;
  if (!programId) {
    [programId] = await db.add('programs', [{ name: 'Computer Science' }]);
    programs = await list('programs');
  }
  const courses = await list('courses');
  let course1 = courses.find(c => c.name === 'Advanced Programming')?.id;
  let course2 = courses.find(c => c.name === 'Web Development')?.id;
  if (!course1) [course1] = await db.add('courses', [{ name: 'Advanced Programming', programId }]);
  if (!course2) [course2] = await db.add('courses', [{ name: 'Web Development', programId }]);

  let users = await list('users');
  let teacher = users.find(u => u.studyflowId === 'TCH-001' || u.email === 'teacher@studyflow.app');
  if (!teacher) {
    const [id] = await db.add('users', [{ studyflowId: 'TCH-001', name: 'Demo Teacher', email: 'teacher@studyflow.app', password: 'studyflow123', role: 'teacher', courseIds: [course1, course2], disabled: false }]);
    teacher = { id, studyflowId: 'TCH-001' };
  } else if (!teacher.studyflowId) {
    teacher = { ...teacher, studyflowId: 'TCH-001', role: 'teacher', courseIds: [course1, course2], disabled: false };
    await db.update('users', [{ id: teacher.id, record: teacher }]);
  }
  let student = users.find(u => u.studyflowId === 'STU-001' || u.email === 'student@studyflow.app');
  if (!student) {
    const [id] = await db.add('users', [{ studyflowId: 'STU-001', name: 'Demo Student', email: 'student@studyflow.app', password: 'studyflow123', role: 'student', programId, courseIds: [course1, course2], disabled: false }]);
    student = { id, studyflowId: 'STU-001' };
  } else if (!student.studyflowId) {
    student = { ...student, studyflowId: 'STU-001', role: 'student', programId, courseIds: [course1, course2], disabled: false };
    await db.update('users', [{ id: student.id, record: student }]);
  }
  users = await list('users');
  const admin = users.find(u => u.studyflowId === 'ADM-001' || u.role === 'admin');
  if (!admin) {
    await db.add('users', [{ studyflowId: 'ADM-001', name: 'StudyFlow Administrator', password: 'StudyFlow@2026', role: 'admin', disabled: false }]);
  } else if (!admin.studyflowId) {
    await db.update('users', [{ id: admin.id, record: { ...admin, studyflowId: 'ADM-001', role: 'admin', disabled: false } }]);
  }

  const assignments = await list('assignments');
  if (!assignments.some(a => a.title === 'JavaScript Fundamentals')) {
    await db.add('assignments', [{ title: 'JavaScript Fundamentals', instructions: 'Submit a short JavaScript solution demonstrating functions and arrays.', courseId: course1, teacherId: teacher.id, dueDate: '2026-10-20' }]);
  }
  const exams = await list('exams');
  if (!exams.some(e => e.title === 'Advanced Programming Midterm')) {
    await db.add('exams', [{ title: 'Advanced Programming Midterm', courseId: course1, date: '2026-10-28' }]);
  }
}

async function findUser(studyflowId: string, password: string, role: string) {
  const users = await list('users');
  return users.find(u => String(u.studyflowId || '').toUpperCase() === String(studyflowId || '').trim().toUpperCase() && u.password === password && u.role === role && !u.disabled) || null;
}

async function createByType(type: string, data: Record<string, any>) {
  if (!tables.includes(type as any)) throw new Error('Unsupported record type');
  if (type === 'users' && !data.studyflowId) {
    const users = await list('users');
    const prefix = String(data.role || 'student') === 'teacher' ? 'TCH' : 'STU';
    const next = users.filter(u => String(u.studyflowId || '').startsWith(prefix + '-')).length + 1;
    data = { ...data, studyflowId: prefix + '-' + String(next).padStart(3, '0') };
  }
  const [id] = await db.add(type, [data]);
  if (!id) throw new Error('Could not create record');
  return { ...data, id };
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'POST /api/auth/register': [async ({ body }) => {
    await seed();
    const input = (body || {}) as Record<string, any>;
    const name = String(input.name || '').trim();
    const password = String(input.password || '');
    const role = String(input.role || '');
    if (!name || name.length > 100) return error('Enter a valid full name (up to 100 characters).', 400);
    if (password.length < 6 || password.length > 128) return error('Password must be between 6 and 128 characters.', 400);
    if (role !== 'student' && role !== 'teacher') return error('Choose Student or Teacher registration.', 400);
    const users = await list('users');
    const prefix = role === 'teacher' ? 'TCH' : 'STU';
    const highest = users.reduce((max, item) => {
      const match = String(item.studyflowId || '').match(new RegExp('^' + prefix + '-(\\d+)$', 'i'));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const studyflowId = prefix + '-' + String(highest + 1).padStart(3, '0');
    const programsNow = await list('programs');
    const coursesNow = await list('courses');
    const programId = programsNow[0]?.id;
    const courseIds = role === 'teacher' ? coursesNow.map(course => course.id) : coursesNow.filter(course => !course.programId || course.programId === programId).map(course => course.id);
    const [id] = await db.add('users', [{ studyflowId, name, password, role, ...(role === 'student' ? { programId } : {}), courseIds, disabled: false }]);
    if (!id) return error('Registration failed. Please try again.', 500);
    return json({ user: { id, studyflowId, name, role, ...(role === 'student' ? { programId } : {}), courseIds, disabled: false } }, 201);
  }],
  'POST /api/auth/login': [async ({ body }) => {
    try {
      const input = (body || {}) as Record<string, any>;
      const role = String(input.role || '');
      if (!['student', 'teacher', 'admin'].includes(role)) return error('Invalid account type.', 400);

      // Admin sign-in only needs the users table. Avoid running the full academic
      // data seeding process during every admin login, which can make sign-in fail.
      if (role === 'admin') {
        let users = await list('users');
        let admin = users.find(u => u.studyflowId === 'ADM-001' || u.role === 'admin');
        if (!admin) {
          const [id] = await db.add('users', [{ studyflowId: 'ADM-001', name: 'StudyFlow Administrator', password: 'StudyFlow@2026', role: 'admin', disabled: false }]);
          if (!id) return error('Unable to initialize administrator account. Please try again.', 500);
          users = await list('users');
        } else if (String(admin.studyflowId || '').trim().toUpperCase() !== 'ADM-001' || admin.role !== 'admin' || admin.disabled) {
          const [ok] = await db.update('users', [{
            id: admin.id,
            record: { ...admin, studyflowId: 'ADM-001', role: 'admin', disabled: false }
          }]);
          if (!ok) return error('Unable to prepare administrator account. Please try again.', 500);
          users = await list('users');
        }
        let configuredPassword = '';
        try {
          configuredPassword = await secrets.readSecret('STUDYFLOW_ADMIN_PASSWORD');
        } catch {
          return error('Administrator password setup is incomplete. Finish the secure setup step, then try again.', 503);
        }
        const user = users.find(u => String(u.studyflowId || '').trim().toUpperCase() === String(input.studyflowId || '').trim().toUpperCase() && u.role === 'admin' && !u.disabled);
        if (!user || String(input.password || '') !== configuredPassword) return error('Invalid Administrator ID or password.', 401);
        const { password, ...safeUser } = user;
        return json({ user: safeUser });
      }

      await seed();
      const user = await findUser(String(input.studyflowId || ''), String(input.password || ''), role);
      if (!user) return error('Invalid StudyFlow ID, password or account type.', 401);
      const { password, ...safeUser } = user;
      return json({ user: safeUser });
    } catch (cause) {
      console.error('StudyFlow login endpoint failed', cause);
      return error('Login service error. Please try again in a moment.', 500);
    }
  }],
  'GET /api/study': [async () => {
    await seed();
    const results = await Promise.all(tables.map(table => list(table)));
    return json(Object.fromEntries(tables.map((table, index) => [table, results[index]])));
  }],
  'POST /api/study': [async ({ body }) => {
    const input = (body || {}) as Record<string, any>;
    const type = String(input.type || '');
    if (!type || !input.data) return error('type and data are required', 400);
    return json(await createByType(type, input.data));
  }],
  'PUT /api/study/:id': [async ({ params, body }) => {
    const input = (body || {}) as Record<string, any>;
    const type = String(input.type || '');
    const id = params.id;
    if (!tables.includes(type as any) || !id || !input.data) return error('Invalid update request', 400);
    const [ok] = await db.update(type, [{ id, record: input.data }]);
    if (!ok) return error('Record not found', 404);
    return json({ id, ...input.data });
  }],
  'DELETE /api/study/:id': [async ({ params, body }) => {
    const input = (body || {}) as Record<string, any>;
    const type = String(input.type || '');
    if (!tables.includes(type as any) || !params.id) return error('Invalid delete request', 400);
    const [ok] = await db.delete(type, [params.id]);
    if (!ok) return error('Record not found', 404);
    return json({ deleted: true });
  }],
});
