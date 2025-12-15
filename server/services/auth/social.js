
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import axios from 'axios';

// --- Configuration ---
// In a real app, these should be in process.env
// We handle missing keys gracefully by falling back to dev mode
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
// WeChat needs AppID + Secret for verification
const WECHAT_APP_ID = process.env.WECHAT_APP_ID;
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Verify Google ID Token
 */
export const verifyGoogleToken = async (idToken) => {
    console.log('[Auth] Verifying Google Token...');

    // 1. Dev/Mock Mode (if no keys configured or special test token)
    if ((!GOOGLE_CLIENT_ID || process.env.NODE_ENV !== 'production') && idToken === 'mock_google_token') {
        console.log('[Auth] Using Mock Google Verification');
        return {
            sub: 'google_mock_123456',
            email: 'mock_user@gmail.com',
            name: 'Google Mock User',
            picture: 'https://lh3.googleusercontent.com/a/header_pic_url'
        };
    }

    // 2. Real Verification
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        return {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
        };
    } catch (error) {
        console.error('[Auth] Google Verification Failed:', error.message);
        throw new Error('Google verification failed');
    }
};

/**
 * Verify Apple Identity Token
 */
export const verifyAppleToken = async (identityToken) => {
    console.log('[Auth] Verifying Apple Token...');

    // 1. Dev/Mock Mode
    if ((!APPLE_CLIENT_ID || process.env.NODE_ENV !== 'production') && identityToken === 'mock_apple_token') {
        console.log('[Auth] Using Mock Apple Verification');
        return {
            sub: 'apple_mock_123456',
            email: 'mock_user@icloud.com'
        };
    }

    // 2. Real Verification
    try {
        const { sub, email } = await appleSignin.verifyIdToken(identityToken, {
            audience: APPLE_CLIENT_ID,
            ignoreExpiration: true, // Optional: useful for dev
        });
        return { sub, email };
    } catch (error) {
        console.error('[Auth] Apple Verification Failed:', error.message);
        throw new Error('Apple verification failed');
    }
};

/**
 * Verify WeChat Auth Code
 * Note: WeChat has diverse flows (MiniProgram vs Web). 
 * This assumes Web Login (OAuth2) or MiniProgram jscode2session.
 */
export const verifyWeChatCode = async (code) => {
    console.log('[Auth] Verifying WeChat Code:', code);

    // 1. Dev/Mock Mode
    if ((!WECHAT_APP_ID || process.env.NODE_ENV !== 'production') && code === 'mock_wechat_code') {
        console.log('[Auth] Using Mock WeChat Verification');
        return {
            openid: 'wechat_mock_123456',
            nickname: 'WeChat Mock User',
            // unionid: '...' // needed if bridging accounts across apps
        };
    }

    if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
        throw new Error('WeChat AppID/Secret not configured');
    }

    // 2. Real Verification
    try {
        // Attempt Web Login access_token flow first
        let url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`;

        // If you are using MiniProgram, switch URL to:
        // url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;

        const response = await axios.get(url);
        const data = response.data;

        if (data.errcode) {
            throw new Error(`WeChat API Error: ${data.errmsg}`);
        }

        // For Web Login, we can also fetch user info using the access_token
        // const userInfoResponse = await axios.get(`https://api.weixin.qq.com/sns/userinfo?access_token=${data.access_token}&openid=${data.openid}`);

        return {
            openid: data.openid,
            unionid: data.unionid, // Optional
            // nickname: userInfoResponse.data.nickname // If fetching user info
        };

    } catch (error) {
        console.error('[Auth] WeChat Verification Failed:', error.message);
        throw new Error('WeChat verification failed');
    }
};
