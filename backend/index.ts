import { router, json, error, db } from '@appdeploy/sdk';

const tables = {
  program: 'study_programs',
  course: 'study_courses',
  assignment: 'study_assignments',
  exam: 'study_exams',
  submission: 'study_submissions',
};

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'GET /api/study': [
    async () => {
      const [programs, courses, assignments, exams] = await Promise.all([
        db.list(tables.program, { limit: 100 }),
        db.list(tables.course, { limit: 100 }),
        db.list(tables.assignment, { limit: 100 }),
        db.list(tables.exam, { limit: 100 }),
      ]);
      return json({
        programs: programs.items,
        courses: courses.items,
        assignments: assignments.items,
        exams: exams.items,
      });
    },
  ],
  'POST /api/study': [
    async ({ body }) => {
      const input = body as { type?: string; data?: Record<string, unknown> };
      if (!input.type || !tables[input.type as keyof typeof tables] || !input.data)
        return error('Invalid study item', 400);
      const [id] = await db.add(tables[input.type as keyof typeof tables], [input.data]);
      if (!id) return error('Could not save item', 500);
      return json({ id });
    },
  ],
  'PUT /api/study/:id': [
    async ({ params, body }) => {
      const input = body as { type?: string; data?: Record<string, unknown> };
      if (!input.type || !tables[input.type as keyof typeof tables] || !input.data)
        return error('Invalid study item', 400);
      const [existing] = await db.get(tables[input.type as keyof typeof tables], [params.id]);
      if (!existing) return error('Item not found', 404);

      const { id: _id, ...changes } = input.data;
      const record = { ...existing, ...changes };
      const [ok] = await db.update(tables[input.type as keyof typeof tables], [
        { id: params.id, record },
      ]);
      return ok ? json({ ok: true }) : error('Could not update item', 500);
    },
  ],
  'DELETE /api/study/:id': [
    async ({ params, body }) => {
      const input = body as { type?: string };
      if (!input.type || !tables[input.type as keyof typeof tables])
        return error('Invalid study item', 400);
      const [ok] = await db.delete(tables[input.type as keyof typeof tables], [params.id]);
      return ok ? json({ ok: true }) : error('Could not delete item', 500);
    },
  ],
});
