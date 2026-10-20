import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { reset } from '../src/store.js';

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
beforeEach(() => reset());

const post = (body) =>
  fetch(`${base}/items`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('GET /health returns ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
});

test('POST /items creates an item and GET returns it', async () => {
  const res = await post({ name: 'Bolt', quantity: 10 });
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.deepEqual(created, { id: 1, name: 'Bolt', quantity: 10 });

  assert.deepEqual(await (await fetch(`${base}/items/1`)).json(), created);
  assert.deepEqual(await (await fetch(`${base}/items`)).json(), [created]);
});

test('POST /items rejects invalid input', async () => {
  for (const body of [{}, { name: '', quantity: 1 }, { name: 'x', quantity: -1 }, { name: 'x', quantity: '5' }]) {
    assert.equal((await post(body)).status, 400, JSON.stringify(body));
  }
});

test('GET /items/:id returns 404 for unknown id', async () => {
  assert.equal((await fetch(`${base}/items/999`)).status, 404);
});
