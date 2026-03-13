import { useState, useEffect } from 'react';
import logoBd from '../assets/logo_bd.png';

export const LoginView = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState(''); // Acts as Username/Email input
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState(''); // For Admin Backdoor & Name in Register
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [debugMsg, setDebugMsg] = useState('');

    // Auto-fill for easier testing (can remove in prod)
    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, { // Root health check
                method: 'HEAD',
                headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY }
            });
            setDebugMsg('Connection: Online');
        } catch (e) {
            setDebugMsg(`Connection Error: ${e.message}`);
        }
    };

    const clearSession = () => {
        localStorage.clear();
        sessionStorage.clear();
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setDebugMsg('Authenticating...');

        // 1. ALWAYS CLEAR OLD SESSION FIRST
        clearSession();

        // 2. ADMIN BACKDOOR (Emergency Access) - works from both normal field and Need Help mode
        if ((username === 'admin' || email === 'admin' || email === 'admin@bd.com') && password === 'admin') {
            setTimeout(() => {
                const adminUser = {
                    id: 'admin-master',
                    email: 'admin@bd.com',
                    name: 'Super Admin',
                    role: 'Project Manager',
                    avatar: null,
                    color: 'bg-indigo-600'
                };
                // Fake Session
                localStorage.setItem('sb-bd-auth-token', JSON.stringify({
                    access_token: 'mock-admin-token',
                    user: { id: 'admin-master', email: 'admin@bd.com' }
                }));
                onLogin(adminUser);
            }, 1000);
            return;
        }

        try {
            // 3. REST API Login
            // Auto-append domain if username is entered (no @)
            const cleanEmail = email.trim().replace(/\s+/g, '').toLowerCase();
            let finalEmail = cleanEmail;
            if (!cleanEmail.includes('@')) {
                finalEmail = `${cleanEmail}@bd.com`;
            }

            const authUrl = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`;
            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: finalEmail,
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error_description === 'Invalid login credentials') {
                    throw new Error(`Login Gagal. Pastikan Username/Email dan Password benar.\n(Mencoba login sebagai: ${finalEmail})`);
                }
                throw new Error(data.error_description || data.msg || 'Login failed');
            }

            if (!data.user) {
                throw new Error('No user data returned');
            }

            // 4. Save Session (Standard Key)
            localStorage.setItem('sb-bd-auth-token', JSON.stringify({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                user: data.user
            }));

            // 5. Verify Profile Status & Get Details
            const profileUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=*,roles(name)`;
            const profileRes = await fetch(profileUrl, {
                headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${data.access_token}`
                }
            });

            let profile = null;
            if (profileRes.ok) {
                const profiles = await profileRes.json();
                if (profiles.length > 0) profile = profiles[0];
            }

            // CRITICAL SECURITY FIX: Strict Profile Check
            if (!profile) {
                // If profile is missing, it might be a sync issue or account deleted.
                // Do NOT allow login as it creates ghost users.
                throw new Error('Profil pengguna tidak ditemukan dalam sistem.\nHubungi Admin untuk pengecekan.');
            }

            if (profile.status === 'pending') {
                throw new Error('Akun Anda sedang menunggu persetujuan Admin.\nMohon tunggu konfirmasi.');
            }

            if (profile.status === 'rejected') {
                throw new Error('Maaf, registrasi akun Anda tidak disetujui.');
            }

            onLogin({
                id: data.user.id,
                email: data.user.email,
                name: profile.name || data.user.user_metadata?.name || email.split('@')[0],
                username: profile.username || data.user.user_metadata?.username || '',
                role: profile.roles?.name || 'Member',
                status: profile.status,
                avatar: profile.avatar || null,
                color: profile.color || 'bg-indigo-500'
            });

        } catch (err) {
            console.error('Login Error:', err);
            setError(err.message);
            setDebugMsg(`Fail: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Force create email from username input
            let cleanUsername = email.trim().toLowerCase().replace(/\s+/g, '');
            if (!cleanUsername) throw new Error('Username wajib diisi');

            // Allow alphanumeric, dot, underscore, dash only
            if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
                throw new Error('Username hanya boleh huruf, angka, titik, underscore, dan strip (tanpa spasi).');
            }

            // Append domain if not present
            const finalEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@bd.com`;

            const authUrl = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/signup`;
            const response = await fetch(authUrl, {
                method: 'POST',
                headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: finalEmail,
                    password: password,
                    data: {
                        name: username,
                        username: cleanUsername,
                        status: 'pending' // Default status for approval
                    }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.msg || data.error_description || 'Signup failed');

            if (data.user) {
                // EXPLICITLY CREATE PROFILE (Client-Side Backup to Trigger)
                try {
                    // Check for token (Auto-confirm vs Email Confirm)
                    const accessToken = data.access_token || data.session?.access_token;

                    if (accessToken) {
                        // 1. Fetch a valid Role ID
                        let validRoleId = 1; // Fallback
                        try {
                            const roleRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/roles?select=id&limit=1`, {
                                headers: {
                                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                                    'Authorization': `Bearer ${accessToken}`
                                }
                            });
                            if (roleRes.ok) {
                                const roles = await roleRes.json();
                                if (roles.length > 0) validRoleId = roles[0].id;
                            }
                        } catch (e) {
                            console.warn('Failed to fetch roles, using fallback 1');
                        }

                        const profileUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles`;
                        const profilePayload = {
                            id: data.user.id,
                            // email: finalEmail, // REMOVED: Column does not exist in 'profiles'
                            username: cleanUsername,
                            name: username,
                            status: 'pending',
                            role_id: validRoleId, // DYNAMIC VALID ID
                            color: 'bg-indigo-500'
                        };

                        const profileRes = await fetch(profileUrl, {
                            method: 'POST',
                            headers: {
                                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'resolution=merge-duplicates'
                            },
                            body: JSON.stringify(profilePayload)
                        });

                        if (!profileRes.ok) {
                            const errData = await profileRes.json().catch(() => ({}));
                            throw new Error(errData.message || `HTTP ${profileRes.status}`);
                        }

                    } else {
                        console.log('No access token returned (Email Confirmation might be ON). Reliance on DB Trigger.');
                    }
                } catch (profileErr) {
                    console.error('Manual profile creation warning:', profileErr);
                    // ALERT THE USER
                    alert(`Warning: User created in Auth, but Profile creation failed!\nReason: ${profileErr.message}\n\nPlease contact Admin with this error.`);
                    // Don't throw here, let them proceed strictly to login (which will block them anyway if profile missing)
                    // But blocking them here is better for UX so they don't think they are done.
                }
            }
            alert(`Registrasi berhasil!\nUsername: ${cleanUsername}\n\nStatus akun: MENUNGGU PERSETUJUAN.\nSilakan hubungi Admin untuk aktivasi.`);
            setIsLogin(true);
            setEmail(cleanUsername); // Pre-fill login

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <img src={logoBd} alt="BD Project Management" className="h-16 mx-auto mb-4 object-contain" />
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">BD Project Management</h2>
                        <p className="text-slate-500 mt-2">Masuk untuk mengelola proyek</p>
                    </div>

                    <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm whitespace-pre-line">
                                {error}
                            </div>
                        )}

                        {/* Quick Debug Info */}
                        <div className="text-xs text-slate-400 text-center">{debugMsg}</div>

                        {!isLogin && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        )}

                        {isLogin && username === 'admin' ? (
                            // Admin Backdoor Mode
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username (Admin)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{isLogin ? 'Username / Email' : 'Username'}</label>
                                <input
                                    type="text"
                                    required={isLogin && username !== 'admin'}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                    placeholder={isLogin ? "Contoh: andi" : "Buat username (tanpa spasi)"}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex justify-center items-center"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                isLogin ? 'Masuk' : 'Daftar'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setUsername(''); // Clear backdoor trigger
                            }}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            {isLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
                        </button>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-center text-xs text-slate-400">
                        <button onClick={() => setUsername('admin')} className="hover:text-slate-600">Need Help?</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
