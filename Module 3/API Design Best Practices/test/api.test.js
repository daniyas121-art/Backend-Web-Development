const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp, resetData } = require('../src/app');

let server;
let baseUrl;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options
  });
  return { status: response.status, body: await response.json() };
}

(async () => {
  resetData();
  server = http.createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  let result = await request('/posts');
  assert.equal(result.status, 200);
  assert.equal(result.body.data.length, 2);
  assert.deepEqual(result.body.meta, { page: 1, limit: 2, total: 5, pages: 3 });

  result = await request('/posts?limit=1000000');
  assert.equal(result.body.meta.limit, 100);

  result = await request('/posts/1');
  assert.equal(result.status, 200);
  assert.equal(result.body.data.id, 1);

  result = await request('/posts/999');
  assert.equal(result.status, 404);
  assert.deepEqual(result.body.error, { code: 'NOT_FOUND', message: 'Post not found' });

  result = await request('/posts', {
    method: 'POST',
    body: JSON.stringify({ title: 'API contracts', author: 'dev' })
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.title, 'API contracts');

  result = await request('/posts/1/likes', { method: 'POST' });
  assert.equal(result.status, 201);
  assert.deepEqual(result.body.data, { postId: 1, likes: 1 });

  result = await request('/posts/999/likes', { method: 'POST' });
  assert.equal(result.status, 404);

  result = await request('/explode');
  assert.equal(result.status, 500);
  assert.deepEqual(result.body.error, {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong'
  });
  assert.equal(JSON.stringify(result.body).includes('SQLITE'), false);
  assert.equal(JSON.stringify(result.body).includes('stack'), false);

  result = await request('/getPosts');
  assert.equal(result.status, 404);
  assert.deepEqual(result.body.error, { code: 'NOT_FOUND', message: 'Route not found' });

  await new Promise((resolve) => server.close(resolve));
  console.log('API contract tests passed');
})().catch((error) => {
  if (server) server.close();
  console.error(error);
  process.exitCode = 1;
});
