
const BASE_URL = 'http://localhost:3001';

async function testSocialAuth() {
    console.log('🧪 Testing Social Auth Mock Flow...');

    // 1. Google (Known Good)
    console.log('\n🇬🇧 Testing Google...');
    try {
        const res = await fetch(`${BASE_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: 'mock_google_token' })
        });
        const data = await res.json();
        console.log(`Google Status: ${res.status}`);
        if (!res.ok) console.error('Google Error:', data);
        else console.log('Google Success:', data.user.username);
    } catch (e) { console.error('Google Connection Error', e); }

    // 2. Apple
    console.log('\n🍎 Testing Apple...');
    try {
        const res = await fetch(`${BASE_URL}/api/auth/apple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: 'mock_apple_token' })
        });
        const data = await res.json();
        console.log(`Apple Status: ${res.status}`);
        if (!res.ok) console.error('Apple Error:', data);
        else console.log('Apple Success:', data.user.username);
    } catch (e) { console.error('Apple Connection Error', e); }

    // 3. WeChat
    console.log('\n💬 Testing WeChat...');
    try {
        const res = await fetch(`${BASE_URL}/api/auth/wechat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: 'mock_wechat_code' })
        });
        const data = await res.json();
        console.log(`WeChat Status: ${res.status}`);
        if (!res.ok) console.error('WeChat Error:', data);
        else console.log('WeChat Success:', data.user.username);
    } catch (e) { console.error('WeChat Connection Error', e); }
}

testSocialAuth();
