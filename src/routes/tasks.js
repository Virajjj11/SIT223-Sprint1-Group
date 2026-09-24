// REST API routes for tasks: /api/tasks
const express = require('express');
const { validateTask } = require('../validation');

module.exports = function taskRoutes(service, onChange = () => {}) {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(service.list({ status: req.query.status }));
  });

  router.get('/summary', (req, res) => {
    res.json(service.summary());
  });

  router.get('/:id', (req, res) => {
    const task = service.get(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.json(task);
  });

  router.post('/', (req, res) => {
    const errors = validateTask(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const task = service.create(req.body);
    onChange();
    return res.status(201).json(task);
  });

  router.put('/:id', (req, res) => {
    const errors = validateTask(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ errors });
    const task = service.update(req.params.id, req.body);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    onChange();
    return res.json(task);
  });

  router.delete('/:id', (req, res) => {
    if (!service.remove(req.params.id)) return res.status(404).json({ error: 'Task not found' });
    onChange();
    return res.status(204).send();
  });

  return router;
};
