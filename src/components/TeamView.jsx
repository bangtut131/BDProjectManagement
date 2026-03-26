import { useState } from 'react';
import { Plus, Trash2, X, User, Briefcase, Mail, Shield, Check, UserPlus, Camera, Loader2 } from 'lucide-react';
import { Card } from './Card';
import { Avatar } from './Avatar';
// import { supabase } from '../lib/supabaseClient'; // REMOVED SDK

export const TeamView = ({ users, currentUser, roles, onUpdateRoles, onAddUser, onUpdateUser, onDeleteUser, onUpdateAvatar, projects, tasks, onRefresh }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Role Management State
    const [editingRole, setEditingRole] = useState(null);
    const [roleFormData, setRoleFormData] = useState({ name: '', color: 'bg-slate-500', permissions: {} });

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        role: '',
        email: '',
        password: '',
        color: 'bg-indigo-500',
        avatar: ''
    });
    const [uploading, setUploading] = useState(false);
    const [avatarUploadingId, setAvatarUploadingId] = useState(null);
    const [changePassword, setChangePassword] = useState(false);

    // Resolve Permissions
    const userRoleObj = roles.find(r => r.name === currentUser?.role);
    const isSuperAdmin = currentUser?.email === 'admin@bd.com';
    const permissions = isSuperAdmin ?
        { canManageTeam: true, canManageProjects: true, canManageTasks: true, canManageRoles: true, canDeleteTasks: true, canDeleteProjects: true }
        : (userRoleObj?.permissions || { canManageTeam: false, canManageRoles: false });

    const canManageTeam = permissions.canManageTeam;
    const canManageRoles = permissions.canManageRoles;

    const COLORS = [
        'bg-indigo-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500',
        'bg-amber-500', 'bg-purple-500', 'bg-cyan-500', 'bg-slate-500'
    ];

    const PERMISSION_LABELS = {
        canManageTeam: 'Kelola Anggota Tim (Tambah/Hapus)',
        canManageProjects: 'Kelola Project (Buat/Edit/Hapus)',
        canManageTasks: 'Kelola Tugas (Buat/Edit)',
        canDeleteTasks: 'Hapus Tugas',
        canManageRoles: 'Kelola Role & Akses (Admin)'
    };

    const openAddModal = () => {
        setEditingUser(null);
        setFormData({ name: '', username: '', role: roles[0]?.name || '', email: '', password: '', color: 'bg-indigo-500' });
        setChangePassword(true); // Always required for new users
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        if (!canManageTeam && user.id !== currentUser.id) {
            alert('Anda hanya bisa mengedit profil Anda sendiri.');
            return;
        }

        setEditingUser(user);
        setFormData({
            name: user.name,
            username: user.username || '',
            role: user.role,
            email: user.email || '',
            password: '', // Reset password field for security
            color: user.color,
            avatar: user.avatar
        });
        setChangePassword(false); // Default to unchecked
        setIsModalOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.role) return alert('Nama dan Role harus diisi');

        const initials = formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        if (editingUser) {
            onUpdateUser({
                ...editingUser,
                ...formData,
                avatar: formData.avatar || initials
            });
        } else {
            onAddUser({
                ...formData,
                avatar: formData.avatar || initials
            });
        }

        setIsModalOpen(false);
        setEditingUser(null);
    };

    // Role Management Functions
    const handleSaveRole = () => {
        if (!roleFormData.name) return;

        let newRoles = [...roles];
        if (editingRole) {
            newRoles = newRoles.map(r => r.id === editingRole.id ? { ...editingRole, ...roleFormData } : r);
        } else {
            newRoles.push({
                // id: `r-${Date.now()}`, // Let backend handle ID usually, but here optimistic
                ...roleFormData
            });
        }
        onUpdateRoles(newRoles);
        setIsRoleModalOpen(false);
        setEditingRole(null);
    };

    const handleDeleteRole = (roleId) => {
        if (confirm('Hapus role ini? Pastikan tidak ada user yang menggunakan role ini.')) {
            onUpdateRoles(roles.filter(r => r.id !== roleId));
            setIsRoleModalOpen(false); // Close after delete
        }
    };

    // REST Upload Handler - REPLACES SDK
    const handleFileUpload = async (e) => {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.floor(Math.random() * 1000000)}.${fileExt}`;

            // Direct REST Upload
            const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/avatars/${fileName}`;
            const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

            // Get Token
            let token = key;
            const localKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
            if (localKey) {
                try {
                    const session = JSON.parse(localStorage.getItem(localKey));
                    if (session?.access_token) token = session.access_token;
                } catch (e) { /* ignore */ }
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': key,
                    'Authorization': `Bearer ${token}`,
                    // Content-Type is inferred from body usually, or specific
                    'Content-Type': file.type || 'image/jpeg',
                    'x-upsert': 'true'
                },
                body: file
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Upload gagal (network/permission)');
            }

            // Construct Public URL manually
            const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;

            setFormData(prev => ({ ...prev, avatar: publicUrl }));
        } catch (error) {
            console.error(error);
            alert('Gagal upload gambar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const pendingUsers = users.filter(u => u.status === 'pending');
    // Filter active users for the main list so pending ones don't show up twice or in main list
    const activeUsers = users.filter(u => u.status !== 'pending');

    // Approval State
    const [approvalUser, setApprovalUser] = useState(null);
    const [approvalRoleName, setApprovalRoleName] = useState('');

    const handleApproveUser = (user) => {
        setApprovalUser(user);
        setApprovalRoleName(roles[0]?.name || 'Member'); // Default to first role or Member
    };

    const confirmApproval = () => {
        if (!approvalUser) return;

        const selectedRoleObj = roles.find(r => r.name === approvalRoleName);
        const updates = {
            ...approvalUser,
            status: 'active',
            role: approvalRoleName, // Optimistic UI
            role_id: selectedRoleObj?.id // Backend FK
        };

        onUpdateUser(updates);
        setApprovalUser(null);
    };

    const handleRejectUser = (userId) => {
        if (confirm('Tolak dan hapus pendaftaran ini?')) {
            onDeleteUser(userId);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Pending Approvals Section */}
            {canManageTeam && pendingUsers.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
                        <UserPlus size={20} /> Permintaan Bergabung ({pendingUsers.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingUsers.map(u => (
                            <div key={u.id} className="p-4 flex items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Avatar user={u} size="md" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 dark:text-white truncate">{u.name}</p>
                                        <p className="text-xs text-slate-500 truncate">@{u.username || 'user'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => handleRejectUser(u.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                                        title="Tolak"
                                    >
                                        <X size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleApproveUser(u)}
                                        className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm transition"
                                        title="Setujui"
                                    >
                                        <Check size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Header / Toolbar */}
            <div className="text-xs text-slate-400 mb-2 px-2">
                Debug Info: Total Users: {users.length} | Pending: {pendingUsers.length} | Active: {activeUsers.length}
            </div>
            {canManageTeam && (
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Daftar Anggota</h2>
                        <button
                            onClick={onRefresh}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
                            title="Refresh Data"
                        >
                            <Loader2 size={18} className="hover:animate-spin" /> {/* Using Loader2 as generic refresh icon since RefreshCw might need import, or reuse Loader2 */}
                        </button>
                    </div>
                    {canManageRoles && (
                        <button
                            onClick={() => {
                                setEditingRole(null);
                                setRoleFormData({
                                    name: '',
                                    color: 'bg-slate-500',
                                    permissions: {
                                        canManageTeam: false,
                                        canManageProjects: false,
                                        canManageTasks: true,
                                        canDeleteTasks: false,
                                        canManageRoles: false
                                    }
                                });
                                setIsRoleModalOpen(true);
                            }}
                            className="flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition"
                        >
                            <Shield size={16} />
                            Kelola Role & Akses
                        </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeUsers.map(user => {
                    const userTasks = tasks ? tasks.filter(t => (t.assignees || []).includes(user.id)).length : 0;
                    const userProjects = tasks ? new Set(tasks.filter(t => (t.assignees || []).includes(user.id)).map(t => t.projectId)).size : 0;

                    return (
                        <Card key={user.id} className="p-6 flex flex-col items-center text-center hover:shadow-lg transition group relative">
                            {canManageTeam && onDeleteUser && (
                                <button
                                    onClick={() => onDeleteUser(user.id)}
                                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2"
                                    title="Hapus Anggota"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}

                            <div className="mb-4 relative group/avatar">
                                <Avatar user={user} size="xl" />
                                {currentUser?.id === user.id && (
                                    <>
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                                            {avatarUploadingId === user.id ? (
                                                <Loader2 size={24} className="animate-spin" />
                                            ) : (
                                                <Camera size={24} />
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    if (file.size > 2 * 1024 * 1024) {
                                                        alert('Ukuran file maksimal 2MB');
                                                        return;
                                                    }

                                                    setAvatarUploadingId(user.id);
                                                    try {
                                                        const reader = new FileReader();
                                                        reader.onloadend = async () => {
                                                            if (onUpdateAvatar) {
                                                                await onUpdateAvatar(user.id, reader.result);
                                                            }
                                                            setAvatarUploadingId(null);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    } catch (error) {
                                                        console.error(error);
                                                        setAvatarUploadingId(null);
                                                    }
                                                }} 
                                                disabled={avatarUploadingId === user.id}
                                            />
                                        </label>
                                    </>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{user.name}</h3>
                            <p className="text-xs text-slate-400 mb-1">@{user.username || user.email?.split('@')[0]}</p>
                            <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-4">{user.role}</p>

                            <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between text-sm text-slate-500">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-white">{userProjects}</span>
                                    <span className="text-xs">Projects</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-white">{userTasks}</span>
                                    <span className="text-xs">Tasks</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-green-600 dark:text-green-400">OK</span>
                                    <span className="text-xs">Status</span>
                                </div>
                            </div>

                            {(canManageTeam || user.id === currentUser?.id) && (
                                <button
                                    onClick={() => openEditModal(user)}
                                    className="mt-4 w-full py-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium transition"
                                >
                                    {canManageTeam ? 'Edit Profil' : 'Edit Profil Saya'}
                                </button>
                            )}
                        </Card>
                    );
                })}

                {canManageTeam && (
                    <button
                        onClick={openAddModal}
                        className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition h-full min-h-[250px]"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                            <Plus size={24} />
                        </div>
                        <span className="font-medium">Undang Anggota</span>
                    </button>
                )}
            </div>

            {/* Approval Modal */}
            {approvalUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                <Check size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Setujui Pendaftaran?</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Anda akan mengaktifkan akun <strong>{approvalUser.name}</strong>.
                            </p>
                        </div>

                        <div className="pt-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 text-left">
                                Tetapkan Role / Jabatan
                            </label>
                            <select
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={approvalRoleName}
                                onChange={(e) => setApprovalRoleName(e.target.value)}
                            >
                                {roles.map(r => (
                                    <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-400 mt-2 text-left">
                                *User akan mendapatkan akses sesuai permission role ini.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setApprovalUser(null)}
                                className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmApproval}
                                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-bold shadow-lg shadow-emerald-200"
                            >
                                Setujui & Aktifkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editingUser ? 'Edit Profil Anggota' : 'Tambah Anggota Tim'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="relative group cursor-pointer">
                                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 flex items-center justify-center">
                                            {formData.avatar ? (
                                                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={32} className="text-slate-400" />
                                            )}
                                            {uploading && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <Loader2 className="animate-spin text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 rounded-full text-white cursor-pointer hover:bg-indigo-700 shadow-sm">
                                            <Camera size={14} />
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                            />
                                        </label>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Foto Profil</p>
                                        <p className="text-xs text-slate-500">Klik ikon kamera untuk mengganti.</p>
                                    </div>
                                </div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Nama Lengkap</label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Nama anggota..."
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Role / Posisi</label>
                                <div className="relative">
                                    <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    {canManageTeam ? (
                                        <select
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                            value={formData.role}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="" disabled>Pilih Role</option>
                                            {roles.map(role => (
                                                <option key={role.id} value={role.name}>{role.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 opacity-50 cursor-not-allowed"
                                            value={formData.role}
                                            disabled={true}
                                        />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Username</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="username (tanpa spasi)"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>


                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">Password</label>
                                        {editingUser && (
                                            <label className="flex items-center gap-2 cursor-pointer text-xs text-indigo-600">
                                                <input
                                                    type="checkbox"
                                                    checked={changePassword}
                                                    onChange={e => setChangePassword(e.target.checked)}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Ubah Password
                                            </label>
                                        )}
                                    </div>
                                    {(changePassword || !editingUser) && (
                                        <div className="relative animate-in fade-in slide-in-from-top-2">
                                            <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="password"
                                                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder={editingUser ? "Password baru..." : "Password..."}
                                                value={formData.password}
                                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Warna Avatar</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setFormData({ ...formData, color })}
                                                className={`w-8 h-8 rounded-full ${color} ${formData.color === color ? 'ring-2 ring-offset-2 ring-indigo-500' : ''} transition`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">Batal</button>
                                <button onClick={handleSubmit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium">{editingUser ? 'Simpan Perubahan' : 'Tambah Anggota'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Management Modal (Simplified for brevity as it was working) */}
            {
                isRoleModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden p-6 h-[85vh] flex flex-col">
                            <div className="flex justify-between items-center mb-6 shrink-0">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Shield className="text-indigo-600" />
                                    Manajemen Role & Akses
                                </h3>
                                <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                            </div>

                            <div className="flex flex-1 overflow-hidden gap-6">
                                {/* Role List (Sidebar) */}
                                <div className="w-1/3 border-r border-slate-200 dark:border-slate-700 pr-4 overflow-y-auto">
                                    <button
                                        onClick={() => {
                                            setEditingRole(null);
                                            setRoleFormData({
                                                name: '',
                                                color: 'bg-slate-500',
                                                permissions: { canManageTeam: false, canManageProjects: false, canManageTasks: true }
                                            });
                                        }}
                                        className="w-full flex items-center justify-center gap-2 p-3 mb-4 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition font-bold border border-indigo-200 dashed"
                                    >
                                        <Plus size={18} /> Role Baru
                                    </button>

                                    <div className="space-y-2">
                                        {roles.map(role => (
                                            <div
                                                key={role.id}
                                                onClick={() => {
                                                    setEditingRole(role);
                                                    setRoleFormData({
                                                        name: role.name,
                                                        color: role.color || 'bg-slate-500',
                                                        permissions: role.permissions || {}
                                                    });
                                                }}
                                                className={`p-3 rounded-lg cursor-pointer border transition flex items-center justify-between group ${editingRole?.id === role.id
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]'
                                                    : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-indigo-400'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${role.color || 'bg-slate-400'} border border-white/20`} />
                                                    <span className="font-semibold">{role.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Role Editor (Main) */}
                                <div className="flex-1 overflow-y-auto px-1">
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Nama Role</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    value={roleFormData.name}
                                                    onChange={e => setRoleFormData({ ...roleFormData, name: e.target.value })}
                                                    placeholder="Contoh: Manager, Staff..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Tanda Warna</label>
                                                <div className="flex gap-2 flex-wrap">
                                                    {COLORS.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => setRoleFormData({ ...roleFormData, color })}
                                                            className={`w-8 h-8 rounded-full ${color} ${roleFormData.color === color ? 'ring-2 ring-offset-2 ring-indigo-500 text-white flex items-center justify-center' : 'opacity-70 hover:opacity-100'} transition`}
                                                        >
                                                            {roleFormData.color === color && <Check size={14} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Hak Akses & Izin</label>
                                            <div className="grid grid-cols-1 gap-3">
                                                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                                                    <label key={key} className="flex items-start gap-3 p-3 border border-slate-100 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-1 w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            checked={!!roleFormData.permissions[key]}
                                                            onChange={e => setRoleFormData({
                                                                ...roleFormData,
                                                                permissions: { ...roleFormData.permissions, [key]: e.target.checked }
                                                            })}
                                                        />
                                                        <div>
                                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block">{label.split('(')[0]}</span>
                                                            <span className="text-xs text-slate-500">{label}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700 mt-4">
                                            {editingRole ? (
                                                <button
                                                    onClick={() => handleDeleteRole(editingRole.id)}
                                                    className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-2 transition text-sm font-bold"
                                                >
                                                    <Trash2 size={16} /> Hapus Role
                                                </button>
                                            ) : <div></div>}

                                            <div className="flex gap-3">
                                                <button onClick={() => setIsRoleModalOpen(false)} className="px-5 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Batal</button>
                                                <button
                                                    onClick={handleSaveRole}
                                                    disabled={!roleFormData.name}
                                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 transition transform active:scale-95"
                                                >
                                                    {editingRole ? 'Simpan Perubahan' : 'Buat Role Baru'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
