const request = require('supertest');
const app = require('./Backend/server');

async function runChecks() {
  // 1. Simple health check
  const res = await request(app).get('/');
  console.log('GET / status:', res.status, 'body:', res.text);

  // 2. CORS header test (origin header)
  const corsRes = await request(app)
    .get('/')
    .set('Origin', 'http://example.com');
  console.log('CORS Access-Control-Allow-Origin:', corsRes.headers['access-control-allow-origin']);

  // 3. Rate limiter test – make 101 requests
  let limitHit = false;
  for (let i = 0; i < 101; i++) {
    const r = await request(app).get('/');
    if (r.status === 429) {
      limitHit = true;
      console.log(`Rate limit triggered at request ${i + 1}`);
      break;
    }
  }
  if (!limitHit) console.log('Rate limit not triggered within 101 requests (unexpected)');
}

runChecks().catch(err => console.error('Error during checks:', err));
