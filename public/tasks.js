// Front end for the task tracker. Talks to the /api/tasks REST API.
const api = '/api/tasks';

async function refresh() {
  const [tasks, summary] = await Promise.all([
    fetch(api).then((r) => r.json()),
    fetch(`${api}/summary`).then((r) => r.json()),
  ]);
  document.getElementById('summary').textContent =
    `${summary.done} of ${summary.total} tasks done (${summary.percentComplete}%)`;

  const list = document.getElementById('task-list');
  list.innerHTML = '';
  tasks.forEach((t) => {
    const row = document.createElement('tr');
    const cells = [t.title, t.priority, t.dueDate || '-'];
    cells.forEach((text) => {
      const td = document.createElement('td');
      td.textContent = text;
      row.appendChild(td);
    });

    const statusCell = document.createElement('td');
    const select = document.createElement('select');
    ['todo', 'in-progress', 'done'].forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      opt.selected = s === t.status;
      select.appendChild(opt);
    });
    select.onchange = () => update(t.id, { status: select.value });
    statusCell.appendChild(select);
    row.appendChild(statusCell);

    const delCell = document.createElement('td');
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.onclick = () => remove(t.id);
    delCell.appendChild(del);
    row.appendChild(delCell);

    list.appendChild(row);
  });
}

async function update(id, changes) {
  await fetch(`${api}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  refresh();
}

async function remove(id) {
  await fetch(`${api}/${id}`, { method: 'DELETE' });
  refresh();
}

document.getElementById('task-form').onsubmit = async (e) => {
  e.preventDefault();
  const body = {
    title: document.getElementById('title').value,
    priority: document.getElementById('priority').value,
  };
  const due = document.getElementById('dueDate').value;
  if (due) body.dueDate = due;

  const res = await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const errorEl = document.getElementById('error');
  if (!res.ok) {
    const data = await res.json();
    errorEl.textContent = data.errors.join('; ');
    return;
  }
  errorEl.textContent = '';
  e.target.reset();
  refresh();
};

refresh();
