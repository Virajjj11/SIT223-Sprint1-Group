// Builds the Express app. Kept separate from server.js so tests can use it without opening a port.
const path = require('path');
const express = require('express');
const TaskService = require('./services/taskService');
const taskRoutes = require('./routes/tasks');
const { register, metricsMiddleware, tasksGauge } = require('./metrics');
const pkg = require('../package.json');

function createApp(service = new TaskService()) {
  const app = express();
  // Security: do not reveal that the server runs Express (x-powered-by header)
  app.disable('x-powered-by');
  const startedAt = Date.now();

  app.use(express.json());
  app.use(metricsMiddleware);
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      version: process.env.APP_VERSION || pkg.version,
      environment: process.env.APP_ENV || 'development',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    });
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  });

  // Deliberate failure endpoint used to simulate an incident for the monitoring demo.
  app.get('/api/simulate-error', (req, res) => {
    res.status(500).json({ error: 'Simulated server error for monitoring demo' });
  });

  app.use('/api/tasks', taskRoutes(service, () => tasksGauge.set(service.list().length)));

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}

module.exports = createApp;
