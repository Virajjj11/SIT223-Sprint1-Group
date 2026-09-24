const { validateTask } = require('../../src/validation');

describe('validateTask', () => {
  test('accepts a valid task', () => {
    expect(validateTask({ title: 'Finish 7.3HD', priority: 'high', dueDate: '2026-10-01' })).toEqual([]);
  });

  test('rejects a missing title', () => {
    expect(validateTask({})).toContain('title is required and must be a non-empty string');
  });

  test('rejects a title that is only spaces', () => {
    expect(validateTask({ title: '   ' })).toHaveLength(1);
  });

  test('rejects a title longer than 100 characters', () => {
    expect(validateTask({ title: 'a'.repeat(101) })).toContain('title must be 100 characters or fewer');
  });

  test('rejects an invalid status, priority and date together', () => {
    const errors = validateTask({ title: 'x', status: 'nope', priority: 'urgent', dueDate: 'not-a-date' });
    expect(errors).toHaveLength(3);
  });

  test('rejects a non-object body', () => {
    expect(validateTask(null)).toEqual(['Request body must be a JSON object']);
  });

  test('partial validation allows a missing title', () => {
    expect(validateTask({ status: 'done' }, { partial: true })).toEqual([]);
  });
});
