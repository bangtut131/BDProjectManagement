import { X, Download, Upload, AlertTriangle, Database, Users, Shield, Plus, Trash2, Save } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

export const SettingsModal = ({ isOpen, onClose, tasks, projects, subprojects, onImport, users, onAddUser, onUpdateUser, onDeleteUser, roles, onUpdateRoles, initialTab = 'general' }) => {
    const fileInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [error, setError] = useState(null);

    // Reset tab when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    // User Management State
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Member', status: 'active' });

    // Role Management State
    const [editingRoles, setEditingRoles] = useState([]);

    useEffect(() => {
        if (roles) {
            setEditingRoles(JSON.parse(JSON.stringify(roles)));
        }
    }, [roles, isOpen]);

    if (!isOpen) return null;

    // --- General / Backup Handlers ---
    const handleExport = () => {
        try {
            const data = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: { tasks, projects, subprojects }
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'bd-pm-backup-' + new Date().toISOString().split('T')[0] + '.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            setError('Gagal export data: ' + e.message);
        }
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (!json.data || !json.data.tasks || !json.data.projects) throw new Error('Format file tidak valid.');
                if (confirm('PERINGATAN: Import data akan menimpa data yang ada. Lanjutkan?')) {
                    onImport(json.data);
                    onClose();
                }
                setError(null);
            } catch (err) {
                setError(err.message || 'Gagal membaca file');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    };

    // --- User Handlers ---
    const handleAddUserSubmit = () => {
        if (!newUser.name || !newUser.email) return alert('Nama dan Username wajib diisi');

        // Auto-convert username to email
        const cleanUsername = newUser.email.trim().replace(/\s+/g, '').toLowerCase();
        const finalEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@bd.com`;

        onAddUser({
            ...newUser,
            email: finalEmail,
            avatar: null, // Default
            color: 'bg-indigo-500' // Default
        });
        setIsAddingUser(false);
        setNewUser({ name: '', email: '', role: 'Member', status: 'active' });
    };

    // --- Role Handlers ---
    const handleRolePermissionChange = (roleId, permissionKey) => {
        setEditingRoles(prev => prev.map(role => {
            if (role.id === roleId) {
                const currentPerms = role.permissions || {};
                return {
                    ...role,
                    permissions: {
                        ...currentPerms,
                        [permissionKey]: !currentPerms[permissionKey]
                    }
                };
            }
            return role;
        }));
    };

    const handleAddRole = () => {
        const newRole = {
            id: 'new-' + Date.now(),
            name: 'New Role',
            color: 'bg-slate-500',
            permissions: {
                canManageTeam: false,
                canManageProjects: false,
                canDeleteProjects: false,
                canManageTasks: true,
                canDeleteTasks: false,
                canManageRoles: false
            }
        };
        setEditingRoles([...editingRoles, newRole]);
    };

    const handleDeleteRole = (roleId) => {
        if (confirm('Hapus role ini?')) {
            setEditingRoles(prev => prev.filter(r => r.id !== roleId));
        }
    };

    const handleRoleNameChange = (roleId, newName) => {
        setEditingRoles(prev => prev.map(r => r.id === roleId ? { ...r, name: newName } : r));
    };

    const handleSaveRoles = () => {
        onUpdateRoles(editingRoles);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Database className="text-indigo-600" />
                        Pengaturan Sistem
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-64 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-700 p-4 space-y-2">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'general' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                        >
                            <Database size={18} /> Backup & Data
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'users' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                        >
                            <Users size={18} /> Manajemen User
                        </button>
                        <button
                            onClick={() => setActiveTab('roles')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeTab === 'roles' ? 'bg-white dark:bg-slate-800 shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50'}`}
                        >
                            <Shield size={18} /> Role & Akses
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-800">
                        {error && (
                            <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm flex items-start gap-2">
                                <AlertTriangle size={18} className="mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Backup & Data</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-5 hover:border-indigo-500/50 transition">
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 mb-4 rounded-lg w-fit"><Download size={24} /></div>
                                        <h4 className="font-bold text-slate-800 dark:text-white">Export Data</h4>
                                        <p className="text-sm text-slate-500 mb-4">Download backup JSON.</p>
                                        <button onClick={handleExport} className="text-sm bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Download</button>
                                    </div>
                                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-5 hover:border-emerald-500/50 transition">
                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 mb-4 rounded-lg w-fit"><Upload size={24} /></div>
                                        <h4 className="font-bold text-slate-800 dark:text-white">Import Data</h4>
                                        <p className="text-sm text-slate-500 mb-4">Restore dari backup JSON.</p>
                                        <button onClick={handleImportClick} className="text-sm bg-white border border-slate-300 px-4 py-2 rounded hover:bg-slate-50 text-slate-700">Pilih File</button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Manajemen Pengguna</h3>
                                    <button onClick={() => setIsAddingUser(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700">
                                        <Plus size={16} /> Tambah User
                                    </button>
                                </div>

                                {isAddingUser && (
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-indigo-200 dark:border-indigo-900 animate-in fade-in">
                                        <h4 className="font-bold text-sm mb-3">User Baru</h4>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <input type="text" placeholder="Nama Lengkap" className="px-3 py-2 rounded border text-sm" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                                            <input type="text" placeholder="Username / Email" className="px-3 py-2 rounded border text-sm" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                                            <input type="password" placeholder="Password (Min. 6 Karakter)" className="px-3 py-2 rounded border text-sm" value={newUser.password || ''} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                                            <select className="px-3 py-2 rounded border text-sm" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setIsAddingUser(false)} className="text-xs px-3 py-2 text-slate-500 hover:bg-slate-200 rounded">Batal</button>
                                            <button onClick={handleAddUserSubmit} className="text-xs px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Simpan</button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {users.map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 hover:shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full ${u.color || 'bg-slate-400'} flex items-center justify-center text-white text-xs font-bold`}>
                                                    {u.avatar ? <img src={u.avatar} className="w-full h-full rounded-full object-cover" /> : u.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800 dark:text-white">{u.name}</p>
                                                    <p className="text-xs text-slate-500">{u.email} • {u.role}</p>
                                                </div>
                                            </div>
                                            {(u.id !== 1 && u.email !== 'admin@bd.com') && (
                                                <button onClick={() => onDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'roles' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Role & Hak Akses</h3>
                                    <div className="flex gap-2">
                                        <button onClick={handleAddRole} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700">
                                            <Plus size={16} /> Tambah Role
                                        </button>
                                        <button onClick={handleSaveRoles} className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-700">
                                            <Save size={16} /> Simpan
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {editingRoles.map(role => (
                                        <div key={role.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: role.color || '#ccc' }}></div>
                                                    <input
                                                        type="text"
                                                        value={role.name}
                                                        onChange={(e) => handleRoleNameChange(role.id, e.target.value)}
                                                        className="font-bold text-slate-800 dark:text-white bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none px-1"
                                                    />
                                                </div>
                                                <button onClick={() => handleDeleteRole(role.id)} className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {[
                                                    { key: 'canManageTeam', label: 'Kelola Tim' },
                                                    { key: 'canManageProjects', label: 'Kelola Project' },
                                                    { key: 'canDeleteProjects', label: 'Hapus Project' },
                                                    { key: 'canManageTasks', label: 'Kelola Tugas' },
                                                    { key: 'canDeleteTasks', label: 'Hapus Tugas' },
                                                    { key: 'canManageRoles', label: 'Kelola Role' }
                                                ].map(perm => (
                                                    <label key={perm.key} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={role.permissions?.[perm.key] || false}
                                                            onChange={() => handleRolePermissionChange(role.id, perm.key)}
                                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        <span>{perm.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
