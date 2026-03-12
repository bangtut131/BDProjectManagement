import { useState, useEffect } from 'react';
import { X, AlertCircle, Users, Lock, Check } from 'lucide-react';

export const ProjectModal = ({ isOpen, onClose, onSave, users = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        description: '',
        client: '',
        isPrivate: false,
        assignees: [] // Array of user IDs
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
                description: '',
                client: '',
                isPrivate: false,
                assignees: []
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        Tambah Project Baru
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Project</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Contoh: Website Company Profile"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Klien (Opsional)</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.client}
                            onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                            placeholder="Nama Klien / Perusahaan"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mulai</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Selesai</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <p>Project baru akan otomatis dibuatkan Sub-Project "General" agar Anda bisa langsung menambahkan tugas.</p>
                    </div>

                    {/* Privacy & Assignment Section */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Visibilitas & Penugasan Project</label>
                        
                        <div className="flex gap-4 mb-4">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition ${!formData.isPrivate ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                                <input 
                                    type="radio" 
                                    name="visibility" 
                                    className="hidden" 
                                    checked={!formData.isPrivate} 
                                    onChange={() => setFormData({ ...formData, isPrivate: false, assignees: [] })}
                                />
                                <Users size={18} />
                                <span className="text-sm font-medium">Semua Orang</span>
                            </label>
                            
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition ${formData.isPrivate ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                                <input 
                                    type="radio" 
                                    name="visibility" 
                                    className="hidden" 
                                    checked={formData.isPrivate} 
                                    onChange={() => setFormData({ ...formData, isPrivate: true })}
                                />
                                <Lock size={18} />
                                <span className="text-sm font-medium">Khusus Tim Tertentu</span>
                            </label>
                        </div>

                        {formData.isPrivate && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-3 max-h-48 overflow-y-auto space-y-2 animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs text-slate-500 mb-2 font-medium px-1">Pilih anggota yang diizinkan melihat project ini:</p>
                                {users.filter(u => u.status === 'active').map(user => {
                                    const isSelected = formData.assignees.includes(user.id);
                                    return (
                                        <label key={user.id} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition hover:bg-white dark:hover:bg-slate-800 border ${isSelected ? 'border-indigo-300 bg-white dark:border-indigo-700' : 'border-transparent'}`}>
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        const newAssignees = e.target.checked 
                                                            ? [...formData.assignees, user.id]
                                                            : formData.assignees.filter(id => id !== user.id);
                                                        setFormData({ ...formData, assignees: newAssignees });
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
                                                <p className="text-xs text-slate-500 truncate">{user.role}</p>
                                            </div>
                                        </label>
                                    );
                                })}
                                {users.length === 0 && (
                                    <p className="text-sm text-center text-slate-500 py-4">Belum ada anggota tim aktif.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                    >
                        Batal
                    </button>
                    <button
                        onClick={() => {
                            if (!formData.name) return alert('Nama project tidak boleh kosong');
                            onSave(formData);
                        }}
                        className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition"
                    >
                        Simpan Project
                    </button>
                </div>
            </div>
        </div>
    )
}
