# SIT223 Unit Task Tracker

A Node.js + Express web app for tracking unit tasks, built on top of the original SIT223 unit information page.

## Features
- Unit information home page (`/`) and a task tracker UI (`/tasks.html`)
- REST API: `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/:id`, `GET /api/tasks/summary`
- Input validation with clear error messages
- `/health` endpoint (status, version, environment, uptime)
- `/metrics` endpoint with Prometheus metrics (request count, latency, task count, Node.js stats)

## Run locally
```
npm install
npm test
npm start          # http://localhost:3000
```

## Run with Docker
```
docker build -t unit-task-tracker .
docker run -p 3000:3000 unit-task-tracker
```

## Tech stack
Node.js 22, Express, prom-client, Jest, Supertest, Docker, Jenkins, SonarCloud, Trivy, Prometheus, Grafana.
