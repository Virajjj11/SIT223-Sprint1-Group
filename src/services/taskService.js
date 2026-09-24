// In-memory task store with the business logic (create, read, update, delete, summary).
class TaskService {
  constructor() {
    this.reset();
  }

  reset() {
    this.tasks = new Map();
    this.nextId = 1;
  }

  list({ status } = {}) {
    const all = [...this.tasks.values()];
    return status ? all.filter((t) => t.status === status) : all;
  }

  get(id) {
    return this.tasks.get(Number(id)) || null;
  }

  create({ title, status = 'todo', priority = 'medium', dueDate = null }) {
    const now = new Date().toISOString();
    const task = { id: this.nextId++, title: title.trim(), status, priority, dueDate, createdAt: now, updatedAt: now };
    this.tasks.set(task.id, task);
    return task;
  }

  update(id, changes) {
    const task = this.get(id);
    if (!task) return null;
    const allowed = ['title', 'status', 'priority', 'dueDate'];
    for (const key of allowed) {
      if (changes[key] !== undefined) task[key] = key === 'title' ? changes[key].trim() : changes[key];
    }
    task.updatedAt = new Date().toISOString();
    return task;
  }

  remove(id) {
    return this.tasks.delete(Number(id));
  }

  summary() {
    const counts = { total: this.tasks.size, todo: 0, 'in-progress': 0, done: 0 };
    for (const t of this.tasks.values()) counts[t.status] += 1;
    counts.percentComplete = counts.total === 0 ? 0 : Math.round((counts.done / counts.total) * 100);
    return counts;
  }
}

module.exports = TaskService;
