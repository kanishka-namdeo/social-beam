// Login via NextAuth callback and get session cookie
(async () => {
  // Step 1: Get CSRF token
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  console.log('CSRF Token obtained:', csrfToken ? 'yes' : 'no');

  // Step 2: Login using credentials callback
  const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials?redirect=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'demo@socialbeam.dev',
      password: 'demo1234!',
    }).toString(),
  });

  console.log('Login status:', loginRes.status);
  const body = await loginRes.text();
  console.log('Login body:', body.substring(0, 200));

  const setCookies = loginRes.headers.getSetCookie?.() ?? [];
  console.log('Set-Cookie headers:', setCookies.length);
  setCookies.forEach((c, i) => console.log(`  ${i}: ${c.substring(0, 120)}...`));

  // Step 3: Verify session
  const cookieHeader = setCookies.join('; ');
  const sessionRes = await fetch('http://localhost:3000/api/auth/session', {
    headers: {
      'Cookie': cookieHeader,
    },
  });
  const session = await sessionRes.json();
  console.log('Session:', JSON.stringify(session, null, 2));
})();
