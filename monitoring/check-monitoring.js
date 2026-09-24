// Used by the Jenkins Monitoring stage.
// 1. Confirms Prometheus is scraping the production app (target is UP).
// 2. Prints key live metrics.
// 3. Reports any firing alerts (exit code 2) so Jenkins can alert the team.
// Exit codes: 0 = healthy, 1 = production target down, 2 = alerts firing.
const PROM = process.env.PROM_URL || 'http://host.docker.internal:9090';
const WAIT_FOR_ALERTS = Number(process.env.WAIT_FOR_ALERTS || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function query(expr) {
  const res = await fetch(`${PROM}/api/v1/query?query=${encodeURIComponent(expr)}`);
  const body = await res.json();
  return body.data.result;
}

async function firingAlerts() {
  const res = await fetch(`${PROM}/api/v1/alerts`);
  const body = await res.json();
  return body.data.alerts.filter((a) => a.state === 'firing');
}

async function main() {
  // Wait up to 60 s for Prometheus to scrape production successfully
  let up = false;
  for (let i = 0; i < 30 && !up; i++) {
    const result = await query('up{job="tracker-production"}');
    up = result.length > 0 && result[0].value[1] === '1';
    if (!up) await sleep(2000);
  }
  if (!up) {
    console.log('ALERT: production target is DOWN in Prometheus');
    process.exit(1);
  }
  console.log('Prometheus target tracker-production: UP');

  const metrics = {
    'Requests in last 5 min': 'sum(increase(http_requests_total{job="tracker-production"}[5m]))',
    '5xx errors in last 5 min': 'sum(increase(http_requests_total{job="tracker-production",status=~"5.."}[5m]))',
    'p95 response time (s)': 'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="tracker-production"}[5m])))',
    'Memory (MB)': 'process_resident_memory_bytes{job="tracker-production"} / 1000000',
  };
  for (const [label, expr] of Object.entries(metrics)) {
    const r = await query(expr);
    const v = r.length ? Number(r[0].value[1]) : 0;
    console.log(`  ${label}: ${Number.isFinite(v) ? v.toFixed(3) : 'n/a'}`);
  }

  // Check alerts (optionally wait for an expected alert during incident simulation)
  let alerts = await firingAlerts();
  const deadline = Date.now() + WAIT_FOR_ALERTS * 1000;
  while (alerts.length === 0 && Date.now() < deadline) {
    await sleep(5000);
    alerts = await firingAlerts();
  }
  if (alerts.length > 0) {
    console.log(`ALERTS FIRING (${alerts.length}):`);
    for (const a of alerts) {
      console.log(`  [${a.labels.severity}] ${a.labels.alertname} on ${a.labels.job}: ${a.annotations.summary}`);
    }
    process.exit(2);
  }
  console.log('No alerts firing. Production is healthy.');
}

main().catch((err) => {
  console.error('Monitoring check failed:', err.message);
  process.exit(1);
});
