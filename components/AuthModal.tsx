
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const { theme, themeConfig } = useTheme();

    if (!isOpen) return null;


    const handleAuthResponse = async (response: Response) => {
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Authentication failed');
        }
        login(data.token, data.user);
        onClose();
        // Reset form
        setUsername('');
        setPassword('');
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            await handleAuthResponse(response);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'apple' | 'wechat') => {
        console.log(`Initiating ${provider} login...`);
        setIsLoading(true);
        setError(null);

        try {
            let tokenOrCode = '';

            // --- 1. Client-Side Acquisition (Simplified for Dev) ---
            // In a real app, you would use the SDKs here to get the token.
            // For now, we simulate success with a mock token to test the FULL backend flow.

            switch (provider) {
                case 'google':
                    // TODO: Use google.accounts.id.renderButton or shim
                    tokenOrCode = 'mock_google_token';
                    break;
                case 'apple':
                    // TODO: Use AppleID.auth.signIn()
                    tokenOrCode = 'mock_apple_token';
                    break;
                case 'wechat':
                    // TODO: Redirect to WeChat QR page
                    tokenOrCode = 'mock_wechat_code';
                    break;
            }

            // --- 2. Backend Verification ---
            // We always send the token/code to the backend
            const bodyKey = provider === 'wechat' ? 'code' : 'token';

            const response = await fetch(`/api/auth/${provider}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [bodyKey]: tokenOrCode })
            });

            await handleAuthResponse(response);

        } catch (err: any) {
            console.error(`${provider} login error:`, err);
            setError(`${provider} login failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            id="auth-modal" 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={(e) => {
                // Close modal when clicking the backdrop
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                {/* Header */}
                <div className={`p-6 text-center ${isLogin ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'} text-white`}>
                    <h2 className="text-2xl font-black mb-1">
                        {isLogin ? 'Welcome Back!' : 'Join the Club'}
                    </h2>
                    <p className="opacity-90 text-sm font-medium">
                        {isLogin ? 'Sign in to continue your streak' : 'Start your grammar journey today'}
                    </p>
                </div>

                {/* Form */}
                <div className="p-8">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold mb-4 border border-red-100 flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-purple-400 focus:bg-white transition-all outline-none font-medium"
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-purple-400 focus:bg-white transition-all outline-none font-medium"
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg active:scale-95 transition-all
                ${isLogin
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-purple-200'
                                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:shadow-blue-200'}
                ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
              `}
                        >
                            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>

                    {/* Social Login Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-400 font-medium">Or continue with</span>
                        </div>
                    </div>

                    {/* Social Buttons */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button
                            onClick={() => handleSocialLogin('google')}
                            className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-95 group"
                        >
                            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🇬🇧</div>
                            <span className="text-[10px] font-bold text-gray-500">Google</span>
                        </button>
                        <button
                            onClick={() => handleSocialLogin('apple')}
                            className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-95 group"
                        >
                            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🍎</div>
                            <span className="text-[10px] font-bold text-gray-500">Apple</span>
                        </button>
                        <button
                            onClick={() => handleSocialLogin('wechat')}
                            className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-95 group"
                        >
                            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">💬</div>
                            <span className="text-[10px] font-bold text-gray-500">WeChat</span>
                        </button>
                    </div>

                    {/* Toggle */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-500 font-medium text-sm">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError(null);
                                }}
                                className={`ml-2 font-bold ${isLogin ? 'text-purple-600' : 'text-blue-600'} hover:underline`}
                            >
                                {isLogin ? 'Sign Up' : 'Log In'}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default AuthModal;
