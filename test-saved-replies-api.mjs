// Test saved replies CRUD API via the browser

const BASE = 'http://localhost:3000';

// First login
const loginRes = await fetch(BASE + '/api/auth/callback/credentials', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@socialbeam.dev', password: 'demo1234!', redirect: false }),
});
console.log('Login:', loginRes.status);

// Actually, let's use the browser to do this - just test the API endpoint structure
console.log('Saved replies API test script ready');
