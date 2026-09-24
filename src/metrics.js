// Prometheus metrics: default Node.js metrics plus request count and latency per route.
const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
  registers: [register],
});

const tasksGauge = new client.Gauge({
  name: 'tasks_total',
  help: 'Number of tasks currently stored',
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.baseUrl + req.route.path : 'unmatched';
    const labels = { method: req.method, route, status: res.statusCode };
    httpRequests.inc(labels);
    end(labels);
  });
  next();
}

module.exports = { register, metricsMiddleware, tasksGauge };
