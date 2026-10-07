import { router, json, error, db } from '@appdeploy/sdk';

const tables = {
  course: 'study_courses',
  assignment: 'study_assignments',
  exam: 'study_exams',
};

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'GET /api/study': [async () => {
    const [courses, assignments, exams] = await Promise.all([
      db.list(tables.course, { limit: 100 }),
      db.list(tables.assignment, { limit: 100 }),
      db.list(tables.exam, { limit: 100 }),
    ]);
    return json({ courses: courses.items, assignments: assignments.items, exams: exams.items });
  }],
  'POST /api/study': [async ({ body }) => {
    const input = body as { type?: string; data?: Record<string, unknown> };
    if (!input.type || !tables[input.type as keyof typeof tables] || !input.data) return error('Invalid study item', 400);
    const [id] = await db.add(tables[input.type as keyof typeof tables], [input.data]);
    if (!id) return error('Could not save item', 500);
    return json({ id });
  }],
  'PUT /api/study/:id': [async ({ params, body }) => {
    const input = body as { type?: string; data?: Record<string, unknown> };
    if (!input.type || !tables[input.type as keyof typeof tables] || !input.data) return error('Invalid study item', 400);
    const [ok] = await db.update(tables[input.type as keyof typeof tables], [{ id: params.id, record: input.data }]);
    return ok ? json({ ok: true }) : error('Could not update item', 500);
  }],
  'DELETE /api/study/:id': [async ({ params, body }) => {
    const input = body as { type?: string };
    if (!input.type || !tables[input.type as keyof typeof tables]) return error('Invalid study item', 400);
    const [ok] = await db.delete(tables[input.type as keyof typeof tables], [params.id]);
    return ok ? json({ ok: true }) : error('Could not delete item', 500);
  }],
});
