import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import axios from 'axios';
import { ENABLE_AUTH_MOCKS } from '../../config/env.js';

// --- Configuration ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
// WeChat needs AppID + Secret for verification
const WECHAT_APP_ID = process.env.WECHAT_APP_ID;
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Mock verification is OFF unless ENABLE_AUTH_MOCKS=true is explicitly set in a
// non-production environment. It is NEVER reachable in production (see env.js),
// so magic mock tokens cannot bypass real authentication.
if (ENABLE_AUTH_MOCKS) {
    console.warn('[Auth] AUTH MOCKS ENABLED — mock_* tokens will bypass real verification. Dev only.');
}

/**
 * Verify Google ID Token
 */
export const verifyGoogleToken = async (idToken) => {
    if (ENABLE_AUTH_MOCKS && idToken === 'mock_google_token') {
        console.log('[Auth] Using Mock Google Verification');
        return { sub: 'google_mock_123456', email: 'mock_user@gmail.com', name: 'Google Mock User' };
    }

    try {
        const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        return { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
    } catch (error) {
        console.error('[Auth] Google Verification Failed:', error.message);
        throw new Error('Google verification failed');
    }
};

/**
 * Verify Apple Identity Token
 */
export const verifyAppleToken = async (identityToken) => {
    if (ENABLE_AUTH_MOCKS && identityToken === 'mock_apple_token') {
        console.log('[Auth] Using Mock Apple Verification');
        return { sub: 'apple_mock_123456', email: 'mock_user@icloud.com' };
    }

    try {
        // Do NOT ignore expiration: expired identity tokens must be rejected to
        // prevent indefinite replay of a leaked token.
        const { sub, email } = await appleSignin.verifyIdToken(identityToken, {
            audience: APPLE_CLIENT_ID,
        });
        return { sub, email };
    } catch (error) {
        console.error('[Auth] Apple Verification Failed:', error.message);
        throw new Error('Apple verification failed');
    }
};

/**
 * Verify WeChat Auth Code
 */
export const verifyWeChatCode = async (code) => {
    if (ENABLE_AUTH_MOCKS && code === 'mock_wechat_code') {
        console.log('[Auth] Using Mock WeChat Verification');
        return { openid: 'wechat_mock_123456', nickname: 'WeChat Mock User' };
    }

    if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
        throw new Error('WeChat AppID/Secret not configured');
    }
    if (typeof code !== 'string' || !code) {
        throw new Error('WeChat code is required');
    }

    try {
        // Pass user-supplied params via axios `params` so they are properly
        // URL-encoded (avoids query-parameter injection into the upstream URL).
        const response = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
            params: {
                appid: WECHAT_APP_ID,
                secret: WECHAT_APP_SECRET,
                code,
                grant_type: 'authorization_code',
            },
            timeout: 10000,
        });
        const data = response.data;

        if (data.errcode) {
            throw new Error(`WeChat API Error: ${data.errmsg}`);
        }

        return { openid: data.openid, unionid: data.unionid };
    } catch (error) {
        console.error('[Auth] WeChat Verification Failed:', error.message);
        throw new Error('WeChat verification failed');
    }
};
