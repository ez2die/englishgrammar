
// Native fetch is available in Node 18+

const BASE_URL = 'http://localhost:3001';

async function testAuthFlow() {
    console.log('🧪 Starting Auth Flow Test...');
    const username = `testuser_${Date.now()}`;
    const password = 'password123';
    let token = null;

    // 1. Register
    console.log(`\n➡️ Registering user: ${username}`);
    try {
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            console.log('✅ Registration successful');
            token = data.token;
        } else {
            console.error('❌ Registration failed:', data);
            return;
        }
    } catch (err) {
        console.error('❌ Connection failed. Is the server running?', err);
        return;
    }

    // 2. Login
    console.log(`\n➡️ Logging in user: ${username}`);
    try {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            console.log('✅ Login successful');
            if (data.token) console.log('✅ Token received');
        } else {
            console.error('❌ Login failed:', data);
        }
    } catch (err) {
        console.error('❌ Connection failed');
    }

    // 3. Save History
    console.log(`\n➡️ Saving Practice History`);
    try {
        const res = await fetch(`${BASE_URL}/api/user/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sentence: "This is a test sentence.",
                structure_type: "SVO",
                score: 100,
                analysis_snapshot: { test: true }
            })
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            console.log('✅ History saved successfully');
        } else {
            console.error('❌ History save failed:', data);
        }
    } catch (err) {
        console.error('❌ Connection failed');
    }

    // 4. Get History
    console.log(`\n➡️ Fetching Practice History`);
    try {
        const res = await fetch(`${BASE_URL}/api/user/history`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        if (res.ok && Array.isArray(data)) {
            console.log(`✅ History fetched. Count: ${data.length}`);
            if (data.length > 0 && data[0].sentence === "This is a test sentence.") {
                console.log('✅ Data verification passed');
            } else {
                console.error('❌ Data verification failed');
            }
        } else {
            console.error('❌ Fetch history failed:', data);
        }
    } catch (err) {
        console.error('❌ Connection failed');
    }
}

testAuthFlow();
