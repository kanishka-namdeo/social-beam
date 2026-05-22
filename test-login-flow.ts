// Test script for login flow verification

const testLogin = async () => {
  // Step 1: Get CSRF token
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  console.log('CSRF Token:', csrfToken);

  // Step 2: Login using the credentials callback endpoint directly
  const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials?redirect=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'testuser2@socialbeam.io',
      password: 'testpassword123',
    }).toString(),
  });

  console.log('Login status:', loginRes.status);
  console.log('Login body:', await loginRes.text());

  const setCookies = loginRes.headers.getSetCookie?.() ?? [];
  console.log('Set-Cookie headers:', setCookies.length);
  setCookies.forEach((c, i) => console.log(`  ${i}: ${c.substring(0, 80)}...`));
};

testLogin().catch(console.error);
