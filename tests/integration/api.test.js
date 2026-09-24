// Integration tests: call the real Express app over HTTP with Supertest.
const request = require('supertest');
const createApp = require('../../src/app');
const TaskService = require('../../src/services/taskService');

describe('Task API', () => {
  let app;
  beforeEach(() => { app = createApp(new TaskService()); });

  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /metrics exposes Prometheus metrics', async () => {
    await request(app).get('/health');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
  });

  test('GET / serves the home page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Unit Task Tracker');
  });

  test('full create, read, update, delete flow', async () => {
    const created = await request(app).post('/api/tasks').send({ title: 'Record demo video', priority: 'high' });
    expect(created.status).toBe(201);
    const { id } = created.body;

    const fetched = await request(app).get(`/api/tasks/${id}`);
    expect(fetched.body.title).toBe('Record demo video');

    const updated = await request(app).put(`/api/tasks/${id}`).send({ status: 'done' });
    expect(updated.body.status).toBe('done');

    const summary = await request(app).get('/api/tasks/summary');
    expect(summary.body.percentComplete).toBe(100);

    expect((await request(app).delete(`/api/tasks/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/tasks/${id}`)).status).toBe(404);
  });

  test('POST rejects invalid input with 400', async () => {
    const res = await request(app).post('/api/tasks').send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('PUT rejects invalid status with 400', async () => {
    const { body } = await request(app).post('/api/tasks').send({ title: 'a' });
    const res = await request(app).put(`/api/tasks/${body.id}`).send({ status: 'finished' });
    expect(res.status).toBe(400);
  });

  test('PUT and DELETE on a missing task return 404', async () => {
    expect((await request(app).put('/api/tasks/999').send({ status: 'done' })).status).toBe(404);
    expect((await request(app).delete('/api/tasks/999')).status).toBe(404);
  });

  test('GET /api/tasks filters by status', async () => {
    await request(app).post('/api/tasks').send({ title: 'a', status: 'done' });
    await request(app).post('/api/tasks').send({ title: 'b' });
    const res = await request(app).get('/api/tasks?status=done');
    expect(res.body).toHaveLength(1);
  });

  test('simulated error endpoint returns 500', async () => {
    expect((await request(app).get('/api/simulate-error')).status).toBe(500);
  });

  test('unknown route returns 404', async () => {
    expect((await request(app).get('/nope')).status).toBe(404);
  });
});

describe('Security headers', () => {
  test('does not expose the X-Powered-By header', async () => {
    const res = await request(createApp(new TaskService())).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
