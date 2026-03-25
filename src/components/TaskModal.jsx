import { useState, useEffect } from 'react';
import { X, MessageSquare, History, FileText, Send, User, Paperclip, Download, Trash, File, Plus } from 'lucide-react';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../data/constants';
import { formatDate } from '../lib/utils';
import { Avatar } from './Avatar';

export const TaskModal = ({ isOpen, onClose, onSave, onQuickSave, task = null, users, projects, subProjects, onAddSubProject, initialProjectId }) => {
    const [activeTab, setActiveTab] = useState('detail');
    const [newComment, setNewComment] = useState('');

    // Inline Add Subproject State
    const [isAddingSubProject, setIsAddingSubProject] = useState(false);
    const [newSubProject, setNewSubProject] = useState({ name: '', startDate: '', endDate: '' });

    const [formData, setFormData] = useState({
        // ... existing initial state ...
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignees: users.length > 0 ? [users[0].id] : [],
        startDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        projectId: projects[0]?.id || '',
        subProjectId: '',
        comments: [],
        history: [],
        attachments: []
    });

    // ... (UseEffects remain similar, need to ensure they don't conflict) ...
    const [availableSubProjects, setAvailableSubProjects] = useState([]);

    useEffect(() => {
        // ... existing task loading logic ...
        if (task) {
            const sub = subProjects.find(sp => sp.id === task.subProjectId);
            const projId = sub ? sub.projectId : projects[0]?.id;

            setFormData({
                ...task,
                projectId: projId,
                assignees: task.assignees || (task.assignee ? [task.assignee] : []),
                comments: task.comments || [],
                history: task.history || [],
                attachments: task.attachments || []
            });
        } else {
            // Priority: Initial Project ID -> First available Project -> Empty
            const defaultProject = initialProjectId || projects[0]?.id || '';
            setFormData({
                title: '',
                description: '',
                status: 'todo',
                priority: 'medium',
                assignees: users.length > 0 ? [users[0].id] : [],
                startDate: new Date().toISOString().split('T')[0],
                dueDate: new Date().toISOString().split('T')[0],
                projectId: defaultProject,
                subProjectId: '',
                comments: [],
                history: [],
                attachments: []
            });
        }
        setIsAddingSubProject(false);
        setActiveTab('detail');
    }, [task, isOpen, users, projects, subProjects, initialProjectId]);

    useEffect(() => {
        const filtered = subProjects.filter(sp => sp.projectId === formData.projectId);
        setAvailableSubProjects(filtered);

        if (!isOpen) return;

        const currentSubValid = filtered.find(sp => sp.id === formData.subProjectId);
        if (!currentSubValid && filtered.length > 0) {
            // Auto-select first available if current is invalid
            setFormData(prev => ({ ...prev, subProjectId: filtered[0].id }));
        } else if (filtered.length === 0) {
            setFormData(prev => ({ ...prev, subProjectId: '' }));
        }
    }, [formData.projectId, subProjects, isOpen]); // Added isOpen to dependencies

    // ... (Existing handlers) ...

    const handleSaveSubProject = () => {
        if (!newSubProject.name) return alert('Nama Sub Project harus diisi');

        // Defaults if dates are empty
        const start = newSubProject.startDate || formData.startDate;
        const end = newSubProject.endDate || formData.dueDate;

        // Optimistic ID for immediate selection (real ID comes from App but we need to select it)
        // Actually, better to let App handle it, but we need to know which one was just added.
        // For now, we rely on the fact that App adds it to subProjects, and we can maybe find it?
        // Or we just wait for re-render. To ensure selection, we might need to handle it better.
        // Simpler approach: User adds, we reset form, success message. User picks it from list.

        onAddSubProject({
            projectId: formData.projectId,
            name: newSubProject.name,
            startDate: start,
            endDate: end
        });

        setIsAddingSubProject(false);
        setNewSubProject({ name: '', startDate: '', endDate: '' });
    };

    const handleSendComment = () => {
        if (!newComment.trim()) return;
        const commentObj = {
            id: `c${Date.now()}`,
            userId: 1, // Assume current user is ID 1 (Andi P.)
            text: newComment,
            timestamp: new Date().toISOString()
        };

        // Update local state immediately for better UX
        const updatedComments = [commentObj, ...formData.comments];
        setFormData(prev => ({ ...prev, comments: updatedComments }));

        // Real-time bypass save to database without closing modal
        if (task && onQuickSave) {
            onQuickSave(task.id, { comments: updatedComments });
        }

        setNewComment('');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limit size to 500KB
        if (file.size > 500 * 1024) {
            alert('Ukuran file terlalu besar! Maksimal 500KB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result;
            const newFile = {
                id: `f${Date.now()}`,
                name: file.name,
                size: file.size,
                type: file.type,
                data: base64String,
                uploadedAt: new Date().toISOString()
            };

            const updatedAttachments = [...(formData.attachments || []), newFile];
            setFormData({
                ...formData,
                attachments: updatedAttachments
            });
            
            // Auto-save attachment metadata to database if task already exists
            if (task && onQuickSave) {
                onQuickSave(task.id, { attachments: updatedAttachments });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteAttachment = (fileId) => {
        if (confirm('Hapus file lampiran ini?')) {
            const updatedAttachments = formData.attachments.filter(f => f.id !== fileId);
            setFormData({
                ...formData,
                attachments: updatedAttachments
            });
            
            // Auto-save deletion
            if (task && onQuickSave) {
                onQuickSave(task.id, { attachments: updatedAttachments });
            }
        }
    };

    const handleDownload = (file) => {
        const link = document.createElement('a');
        link.href = file.data;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            {task ? 'Edit Tugas' : 'Tambah Tugas Baru'}
                        </h2>
                        {task && (
                            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 overflow-x-auto">
                                <button
                                    onClick={() => setActiveTab('detail')}
                                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'detail' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    <FileText size={14} /> Detail
                                </button>
                                <button
                                    onClick={() => setActiveTab('comments')}
                                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'comments' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    <MessageSquare size={14} /> Komentar
                                </button>
                                <button
                                    onClick={() => setActiveTab('attachments')}
                                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'attachments' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    <Paperclip size={14} /> Lampiran
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'history' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                                >
                                    <History size={14} /> Riwayat
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'detail' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Judul Tugas</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 mb-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Masukkan judul tugas..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi Tugas</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-y min-h-[80px]"
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Masukkan rincian atau deskripsi tugas..."
                                    rows="3"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.projectId}
                                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                        disabled={!!task}
                                    >
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sub Project / Tahapan</label>
                                        {!isAddingSubProject && (
                                            <button
                                                onClick={() => setIsAddingSubProject(true)}
                                                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
                                                type="button"
                                            >
                                                <Plus size={12} /> Baru
                                            </button>
                                        )}
                                    </div>

                                    {isAddingSubProject ? (
                                        <div className="p-3 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg animate-in fade-in slide-in-from-top-2">
                                            <input
                                                type="text"
                                                placeholder="Nama Tahapan (cth: Pondasi)"
                                                className="w-full px-2 py-1 mb-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-700"
                                                value={newSubProject.name}
                                                onChange={e => setNewSubProject({ ...newSubProject, name: e.target.value })}
                                                autoFocus
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSaveSubProject}
                                                    className="flex-1 bg-indigo-600 text-white text-xs py-1 rounded hover:bg-indigo-700"
                                                    type="button"
                                                >
                                                    Simpan
                                                </button>
                                                <button
                                                    onClick={() => setIsAddingSubProject(false)}
                                                    className="flex-1 bg-slate-200 text-slate-700 text-xs py-1 rounded hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
                                                    type="button"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.subProjectId}
                                            onChange={(e) => setFormData({ ...formData, subProjectId: e.target.value })}
                                            disabled={availableSubProjects.length === 0}
                                        >
                                            {availableSubProjects.length === 0 && <option value="">Tidak ada sub project</option>}
                                            {availableSubProjects.map(sp => (
                                                <option key={sp.id} value={sp.id}>{sp.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prioritas</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
                                            <option key={key} value={key}>{val.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ditugaskan Ke</label>
                                {/* Selected Assignees Preview */}
                                {formData.assignees && formData.assignees.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.assignees.map(uid => {
                                            const u = users.find(x => x.id === uid);
                                            if (!u) return null;
                                            return (
                                                <span key={uid} className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2.5 py-1 rounded-full">
                                                    <Avatar user={u} size="xs" />
                                                    {u.name}
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, assignees: formData.assignees.filter(id => id !== uid) })}
                                                        className="ml-0.5 text-indigo-400 hover:text-red-500 transition"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Multi-Select Checkbox List */}
                                <div className="max-h-40 overflow-y-auto border border-slate-300 dark:border-slate-600 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
                                    {users.map(u => {
                                        const isSelected = formData.assignees?.includes(u.id);
                                        return (
                                            <label
                                                key={u.id}
                                                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        const newAssignees = isSelected
                                                            ? formData.assignees.filter(id => id !== u.id)
                                                            : [...(formData.assignees || []), u.id];
                                                        setFormData({ ...formData, assignees: newAssignees });
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <Avatar user={u} size="xs" />
                                                <span className="text-sm text-slate-700 dark:text-slate-200">{u.name}</span>
                                                {u.role && <span className="text-[10px] text-slate-400 ml-auto">{u.role}</span>}
                                            </label>
                                        );
                                    })}
                                </div>
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
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div >
                    )}

                    {
                        activeTab === 'comments' && (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 space-y-4 mb-4 overflow-y-auto">
                                    {formData.comments && formData.comments.length > 0 ? (
                                        formData.comments.map((comment, index) => {
                                            const user = users.find(u => u.id === comment.userId);
                                            return (
                                                <div key={comment.id || index} className="flex gap-3">
                                                    <Avatar user={user} size="sm" />
                                                    <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg rounded-tl-none flex-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-sm font-bold text-slate-800 dark:text-white">{user?.name || 'Unknown'}</span>
                                                            <span className="text-xs text-slate-400">{formatDate(comment.timestamp)}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-300">{comment.text}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-10 text-slate-400">
                                            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                                            <p>Belum ada komentar</p>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Tulis komentar..."
                                        className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                    />
                                    <button
                                        onClick={handleSendComment}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'attachments' && (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileUpload}
                                        accept="image/*,.pdf,.doc,.docx"
                                    />
                                    <Paperclip size={32} className="mx-auto text-slate-400 mb-2" />
                                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Klik atau seret file ke sini</p>
                                    <p className="text-xs text-slate-400 mt-1">Maksimal 500KB per file (Gambar, PDF, Dokumen)</p>
                                </div>

                                <div className="space-y-2">
                                    {formData.attachments && formData.attachments.length > 0 ? (
                                        formData.attachments.map(file => (
                                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-slate-600 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <File size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                                                        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB • {formatDate(file.uploadedAt)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDownload(file)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition"
                                                        title="Download"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAttachment(file.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition"
                                                        title="Hapus"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-slate-400 text-sm">
                                            Belum ada lampiran
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'history' && (
                            <div className="space-y-4">
                                {formData.history && formData.history.length > 0 ? (
                                    <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-6">
                                        {formData.history.map((log, idx) => (
                                            <div key={idx} className="relative">
                                                <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 
                                              ${log.action === 'status' ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">{log.text}</p>
                                                <span className="text-xs text-slate-400">{formatDate(log.timestamp)} • {log.user}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-400">
                                        <History size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>Belum ada riwayat aktivitas</p>
                                    </div>
                                )}
                            </div>
                        )
                    }
                </div >

                {activeTab === 'detail' && (
                    <div className="flex justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => {
                                if (!formData.title) return alert('Judul tugas tidak boleh kosong');
                                if (!formData.subProjectId) return alert('Sub Project harus dipilih');
                                onSave(formData);
                            }}
                            className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition"
                        >
                            Simpan Tugas
                        </button>
                    </div>
                )}
            </div >
        </div >
    );
};
