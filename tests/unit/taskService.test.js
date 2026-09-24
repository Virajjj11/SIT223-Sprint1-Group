const TaskService = require('../../src/services/taskService');

describe('TaskService', () => {
  let service;
  beforeEach(() => { service = new TaskService(); });

  test('creates a task with defaults', () => {
    const task = service.create({ title: '  Write report  ' });
    expect(task).toMatchObject({ id: 1, title: 'Write report', status: 'todo', priority: 'medium' });
  });

  test('assigns increasing ids', () => {
    service.create({ title: 'a' });
    expect(service.create({ title: 'b' }).id).toBe(2);
  });

  test('lists and filters by status', () => {
    service.create({ title: 'a' });
    service.create({ title: 'b', status: 'done' });
    expect(service.list()).toHaveLength(2);
    expect(service.list({ status: 'done' })).toHaveLength(1);
  });

  test('updates only allowed fields', () => {
    const { id } = service.create({ title: 'a' });
    const updated = service.update(id, { status: 'done', id: 99 });
    expect(updated.status).toBe('done');
    expect(updated.id).toBe(id);
  });

  test('returns null when updating a missing task', () => {
    expect(service.update(42, { status: 'done' })).toBeNull();
  });

  test('removes a task', () => {
    const { id } = service.create({ title: 'a' });
    expect(service.remove(id)).toBe(true);
    expect(service.get(id)).toBeNull();
  });

  test('summary calculates percent complete', () => {
    expect(service.summary().percentComplete).toBe(0);
    service.create({ title: 'a', status: 'done' });
    service.create({ title: 'b' });
    expect(service.summary()).toMatchObject({ total: 2, done: 1, todo: 1, percentComplete: 50 });
  });
});
