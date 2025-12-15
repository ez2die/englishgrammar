
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface PracticeRecord {
    id: number;
    sentence: string;
    structure_type: string;
    score: number;
    created_at: string;
}

interface HistoryViewProps {
    onClose: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onClose }) => {
    const [history, setHistory] = useState<PracticeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{ totalPractices: number; averageScore: number } | null>(null);
    const [activeTab, setActiveTab] = useState<'activity' | 'profile'>('activity');

    const { token, user, logout } = useAuth();
    const { theme } = useTheme();

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;

            try {
                // Fetch History
                const historyRes = await fetch('/api/user/history?limit=20', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (historyRes.ok) {
                    const data = await historyRes.json();
                    setHistory(data);
                }

                // Fetch Stats
                const statsRes = await fetch('/api/user/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch user data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const isFresh = theme === 'fresh';

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className={`
        w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col
        ${isFresh ? 'bg-white' : 'bg-white'}
      `}>
                {/* Header */}
                <div className={`p-6 flex items-center justify-between border-b ${isFresh ? 'bg-emerald-50 border-emerald-100' : 'bg-purple-50 border-purple-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg ${isFresh ? 'bg-emerald-500' : 'bg-purple-500'}`}>
                            {user?.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className={`text-xl font-black ${isFresh ? 'text-slate-800' : 'text-gray-800'}`}>{user?.username}</h2>
                            <div className="flex gap-3 text-xs font-bold uppercase opacity-60">
                                <span>Practices: {stats?.totalPractices || 0}</span>
                                <span>•</span>
                                <span>Avg Score: {stats?.averageScore || 0}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors
                            ${activeTab === 'activity'
                                ? (isFresh ? 'border-emerald-500 text-emerald-600' : 'border-purple-500 text-purple-600')
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Activity History
                    </button>
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors
                            ${activeTab === 'profile'
                                ? (isFresh ? 'border-emerald-500 text-emerald-600' : 'border-purple-500 text-purple-600')
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        Profile Settings
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {activeTab === 'activity' ? (
                        <>
                            {loading ? (
                                <div className="text-center py-10 text-gray-400">Loading history...</div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                    No practice history yet. Start learning!
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {history.map(record => (
                                        <div key={record.id} className="bg-white border-2 border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${record.score === 100
                                                    ? (isFresh ? 'bg-emerald-100 text-emerald-700' : 'bg-green-100 text-green-700')
                                                    : (isFresh ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-600')
                                                    }`}>
                                                    {record.structure_type}
                                                </span>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {formatDate(record.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-gray-800 font-medium text-sm mb-3 line-clamp-2">
                                                {record.sentence}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                                                    <div
                                                        className={`h-full rounded-full ${record.score >= 80 ? 'bg-emerald-400' : record.score >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                                                            }`}
                                                        style={{ width: `${record.score}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-black ml-3 text-gray-500">{record.score}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-6">
                            {/* Profile Settings Content */}
                            <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <span className="text-2xl">👤</span> Account Details
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Username</label>
                                        <div className="p-3 bg-gray-50 rounded-xl font-medium text-gray-700">{user?.username}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Account Type</label>
                                        <div className="p-3 bg-gray-50 rounded-xl font-medium text-gray-700">Standard Member</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border-2 border-gray-100 shadow-sm">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500">
                                    <span className="text-2xl">🚪</span> Session
                                </h3>
                                <p className="text-gray-500 text-sm mb-4">
                                    Logging out will end your current session. Your progress and history are safely saved.
                                </p>
                                <button
                                    onClick={() => {
                                        logout();
                                        // Small delay to ensure state updates before unmounting
                                        setTimeout(() => onClose(), 100);
                                    }}
                                    className="w-full py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold border-2 border-red-100 transition-all active:scale-95"
                                >
                                    Log Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryView;
