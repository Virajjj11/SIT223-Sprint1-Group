// Validation rules for task input. Kept separate so it can be unit tested on its own.
const VALID_STATUSES = ['todo', 'in-progress', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function validateTask(input, { partial = false } = {}) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return ['Request body must be a JSON object'];
  }

  if (!partial || input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim().length === 0) {
      errors.push('title is required and must be a non-empty string');
    } else if (input.title.length > 100) {
      errors.push('title must be 100 characters or fewer');
    }
  }

  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (input.priority !== undefined && !VALID_PRIORITIES.includes(input.priority)) {
    errors.push(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  if (input.dueDate !== undefined && Number.isNaN(Date.parse(input.dueDate))) {
    errors.push('dueDate must be a valid date (e.g. 2026-10-01)');
  }

  return errors;
}

module.exports = { validateTask, VALID_STATUSES, VALID_PRIORITIES };
