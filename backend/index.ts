import { router, json, error, db } from '@appdeploy/sdk';

const tables = {
  program: 'study_programs',
  course: 'study_courses',
  assignment: 'study_assignments',
  exam: 'study_exams',
  submission: 'study_submissions',
  user: 'study_users',
  excuse: 'study_excuses',
  attendance: 'study_attendance',
};

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],

  'POST /api/auth/login': [
    async ({ body }) => {
      const input = body as { email?: string; password?: string; role?: string };
      if (!input.email || !input.password || !input.role) return error('Email, password and role are required', 400);

      const users = await db.list(tables.user, { limit: 200 });
      const hash = await hashPassword(input.password);
      const user = users.items.find((u: any) =>
        String(u.email || '').toLowerCase() === input.email!.toLowerCase() &&
        u.passwordHash === hash &&
        u.role === input.role &&
        u.disabled !== true
      );

      if (!user) return error('Invalid login details', 401);
      return json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          programId: user.programId,
          courseIds: user.courseIds || [],
        },
      });
    },
  ],

  'POST /api/admin/users': [
    async ({ body }) => {
      const input = body as { name?: string; email?: string; password?: string; role?: string; programId?: string; courseIds?: string[] };
      if (!input.name || !input.email || !input.password || !['student', 'teacher', 'admin'].includes(input.role || '')) {
        return error('Name, email, password and role are required', 400);
      }
      const users = await db.list(tables.user, { limit: 500 });
      if (users.items.some((u: any) => String(u.email).toLowerCase() === input.email!.toLowerCase())) {
        return error('An account with this email already exists', 409);
      }
      const [id] = await db.add(tables.user, [{
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        role: input.role,
        programId: input.programId || '',
        courseIds: input.courseIds || [],
        disabled: false,
      }]);
      return id ? json({ id }) : error('Could not create account', 500);
    },
  ],

  'PUT /api/admin/users/:id': [
    async ({ params, body }) => {
      const input = body as { name?: string; password?: string; programId?: string; courseIds?: string[]; disabled?: boolean };
      const [existing] = await db.get(tables.user, [params.id]);
      if (!existing) return error('User not found', 404);
      const changes: Record<string, unknown> = { ...input };
      delete changes.password;
      if (input.password) changes.passwordHash = await hashPassword(input.password);
      const [ok] = await db.update(tables.user, [{ id: params.id, record: { ...existing, ...changes } }]);
      return ok ? json({ ok: true }) : error('Could not update account', 500);
    },
  ],

  'GET /api/study': [
    async () => {
      const [programs, courses, assignments, exams, submissions, users, attendance, excuses] = await Promise.all([
        db.list(tables.program, { limit: 200 }),
        db.list(tables.course, { limit: 200 }),
        db.list(tables.assignment, { limit: 200 }),
        db.list(tables.exam, { limit: 200 }),
        db.list(tables.submission, { limit: 500 }),
        db.list(tables.user, { limit: 500 }),
        db.list(tables.attendance, { limit: 1000 }),
        db.list(tables.excuse, { limit: 500 }),
      ]);
      return json({
        programs: programs.items,
        courses: courses.items,
        assignments: assignments.items,
        exams: exams.items,
        submissions: submissions.items,
        users: users.items.map((u: any) => ({ ...u, passwordHash: undefined })),
        attendance: attendance.items,
        excuses: excuses.items,
      });
    },
  ],

  'POST /api/study': [
    async ({ body }) => {
      const input = body as { type?: string; data?: Record<string, unknown> };
      if (!input.type || !tables[input.type as keyof typeof tables] || !input.data) return error('Invalid study item', 400);
      const [id] = await db.add(tables[input.type as keyof typeof tables], [input.data]);
      return id ? json({ id }) : error('Could not save item', 500);
    },
  ],

  'PUT /api/study/:id': [
    async ({ params, body }) => {
      const input = body as { type?: string; data?: Record<string, unknown> };
      if (!input.type || !tables[input.type as keyof typeof tables] || !input.data) return error('Invalid study item', 400);
      const [existing] = await db.get(tables[input.type as keyof typeof tables], [params.id]);
      if (!existing) return error('Item not found', 404);
      const { id: _id, ...changes } = input.data;
      const [ok] = await db.update(tables[input.type as keyof typeof tables], [{ id: params.id, record: { ...existing, ...changes } }]);
      return ok ? json({ ok: true }) : error('Could not update item', 500);
    },
  ],

  'DELETE /api/study/:id': [
    async ({ params, body }) => {
      const input = body as { type?: string };
      if (!input.type || !tables[input.type as keyof typeof tables]) return error('Invalid study item', 400);
      const [ok] = await db.delete(tables[input.type as keyof typeof tables], [params.id]);
      return ok ? json({ ok: true }) : error('Could not delete item', 500);
    },
  ],
});
