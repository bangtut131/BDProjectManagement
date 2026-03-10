import { useState, useEffect, useRef } from 'react';
import { CalendarDays, Users, Save, Edit3, ImageIcon, FileText, Link as LinkIcon, Globe, ExternalLink, Trash2, Clock, BarChart3, Download, List as ListIcon, Plus, Check, X, Crop, GripVertical, Monitor, Upload } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Card } from './Card';
import { formatDate } from '../lib/utils';
import { ImageCropper } from './ImageCropper';

export const OverviewView = ({ project, projects, subProjects = [], tasks = [], onUpdateProject, onAddSubProject, onUpdateSubProject, onDeleteSubProject, onSelectProject, currentUser, userPermissions }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [newResource, setNewResource] = useState({ type: 'link', name: '', url: '', description: '' });
    const [newSubProject, setNewSubProject] = useState({ name: '', startDate: '', endDate: '' });

    // Permission Check
    const canManageProjects = userPermissions?.canManageProjects;

    // Cropper State
    const [showCropper, setShowCropper] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState(null);

    const [editingSubProjectId, setEditingSubProjectId] = useState(null);
    const [editSubProjectData, setEditSubProjectData] = useState({ name: '', startDate: '', endDate: '' });

    const [editingResourceId, setEditingResourceId] = useState(null);
    const [editResourceData, setEditResourceData] = useState({ type: 'link', name: '', url: '', description: '' });

    const [draggedIdx, setDraggedIdx] = useState(null);
    const [localSubProjects, setLocalSubProjects] = useState([]);
    const dragItem = useRef(null);

    useEffect(() => {
        if (project?.id) {
            const filtered = subProjects.filter(sp => sp.projectId === project.id);
            // Sort by order_index safely
            filtered.sort((a, b) => (a.order_index || 0) - (b.order_index || 0) || a.id - b.id);
            setLocalSubProjects(filtered);
        }
    }, [subProjects, project?.id]);
    useEffect(() => {
        if (project) {
            setEditForm({ ...project, resources: project.resources || [] });
        }
    }, [project]);

    const startCrop = (src) => {
        setCropImageSrc(src);
        setShowCropper(true);
    };

    const handleCropComplete = (croppedDataUrl) => {
        setEditForm({ ...editForm, coverImage: croppedDataUrl });
        setShowCropper(false);
        setCropImageSrc(null);
    };

    const handleEditSubProjectClick = (sp) => {
        setEditingSubProjectId(sp.id);
        setEditSubProjectData({ ...sp });
    };

    const handleSaveSubProjectEdit = () => {
        if (!editSubProjectData.name) return alert('Nama Sub Project harus diisi');
        onUpdateSubProject(editSubProjectData);
        setEditingSubProjectId(null);
    };

    const handleCancelSubProjectEdit = () => {
        setEditingSubProjectId(null);
    };

    if (!project && projects.length > 0) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Pilih Project untuk Melihat Detail</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => (
                        <Card
                            key={p.id}
                            className="cursor-pointer hover:border-indigo-500 hover:shadow-lg transition group overflow-hidden"
                            onClick={() => onSelectProject(p.id)}
                        >
                            <div
                                className="h-32 bg-slate-200 dark:bg-slate-700 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                                style={{ backgroundImage: `url(${p.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=2029'})` }}
                            ></div>
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{p.name}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{p.description || 'Belum ada deskripsi.'}</p>
                                <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
                                    <span>{formatDate(p.startDate)}</span>
                                    <span className={`px-2 py-1 rounded-md capitalize ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{p.status}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    } else if (!project) {
        return <div className="p-10 text-center text-slate-500">Tidak ada data project.</div>;
    }

    const handleSaveEdit = () => {
        onUpdateProject(editForm);
        setIsEditing(false);
    };

    const addResource = () => {
        if (!newResource.name || !newResource.url) return;
        const resource = { ...newResource, id: `r${Date.now()}` };
        setEditForm({
            ...editForm,
            resources: [...(editForm.resources || []), resource]
        });
        setNewResource({ type: 'link', name: '', url: '', description: '' });
    };

    const removeResource = (id) => {
        setEditForm({
            ...editForm,
            resources: editForm.resources.filter(r => r.id !== id)
        });
    };

    const handleEditResourceClick = (res) => {
        setEditingResourceId(res.id);
        setEditResourceData({ ...res });
    };

    const handleSaveResourceEdit = () => {
        if (!editResourceData.name || !editResourceData.url) return alert('Nama dan URL harus diisi');
        setEditForm({
            ...editForm,
            resources: editForm.resources.map(r => r.id === editResourceData.id ? editResourceData : r)
        });
        setEditingResourceId(null);
    };

    const handleCancelResourceEdit = () => {
        setEditingResourceId(null);
    };

    const handleAddSubProjectClick = () => {
        if (!newSubProject.name || !newSubProject.startDate || !newSubProject.endDate) {
            alert('Mohon lengkapi data sub-project');
            return;
        }
        onAddSubProject({
            projectId: project.id,
            ...newSubProject
        });
        setNewSubProject({ name: '', startDate: '', endDate: '' });
        setNewSubProject({ name: '', startDate: '', endDate: '' });
    };

    const handleInterfaceUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `interface-${Date.now()}.${fileExt}`;
        const filePath = `${project.id}/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('project-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('project-files')
                .getPublicUrl(filePath);

            setEditForm(prev => ({ ...prev, interfaceImage: publicUrl }));
        } catch (error) {
            console.error('Error uploading interface image:', error);
            alert('Gagal mengupload gambar. Pastikan bucket "project-files" tersedia.');
        }
    };

    const handleRemoveInterfaceImage = () => {
        setEditForm(prev => ({ ...prev, interfaceImage: null }));
    };

    const handleDragStart = (e, index) => {
        dragItem.current = index;
        setDraggedIdx(index);
    };

    const handleDragEnter = (e, index) => {
        if (dragItem.current === null) return;
        if (dragItem.current === index) return;

        const newList = [...localSubProjects];
        const draggedItemContent = newList[dragItem.current];
        newList.splice(dragItem.current, 1);
        newList.splice(index, 0, draggedItemContent);

        dragItem.current = index;
        setDraggedIdx(index);
        setLocalSubProjects(newList);
    };

    const handleDragEnd = () => {
        setDraggedIdx(null);
        dragItem.current = null;

        // Persist Changes
        localSubProjects.forEach((sp, idx) => {
            if (sp.order_index !== idx) {
                onUpdateSubProject({ ...sp, order_index: idx });
            }
        });
    };

    // Project Health Calculation
    const projectSubIds = localSubProjects.map(sp => sp.id);
    const projectCurrentTasks = tasks.filter(t => projectSubIds.includes(t.subProjectId));
    const totalTasks = projectCurrentTasks.length;
    const completedTasks = projectCurrentTasks.filter(t => t.status === 'done').length;
    const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    let healthStatus = 'On Track';
    let healthColor = 'bg-emerald-400';
    let healthMessage = 'Status project jalan sesuai jadwal.';

    if (totalTasks > 0) {
        // Simple heuristic: if < 50% done but near deadline?
        // For now, let's just use progress vs expected progress or just raw progress.
        // Let's stick to a simple mapping for "Realization"
        if (progressPercentage === 100) {
            healthStatus = 'Completed';
            healthColor = 'bg-blue-400';
            healthMessage = 'Semua tugas telah selesai.';
        } else if (progressPercentage < 20 && new Date() > new Date(project?.startDate)) {
            healthStatus = 'At Risk';
            healthColor = 'bg-orange-400'; // status warning
            healthMessage = 'Progress lambat, perlu perhatian.';
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {showCropper && (
                <ImageCropper
                    imageSrc={cropImageSrc}
                    onCrop={handleCropComplete}
                    onCancel={() => setShowCropper(false)}
                    aspectRatio={2.5} // Approximate Banner Ratio
                />
            )}

            {/* Hero Section */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 text-white shadow-xl min-h-[250px] flex items-end">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-60"
                    style={{ backgroundImage: `url(${isEditing ? editForm.coverImage : project.coverImage || 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=2029'})` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

                <div className="relative z-10 p-8 w-full">
                    <div className="flex justify-between items-end">
                        <div className="max-w-3xl">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-1 bg-indigo-500/80 backdrop-blur-sm rounded text-xs font-semibold uppercase tracking-wider">Project Overview</span>
                                <span className={`px-2 py-1 ${project.status === 'active' ? 'bg-emerald-500/80' : 'bg-slate-500/80'} backdrop-blur-sm rounded text-xs font-semibold uppercase tracking-wider`}>{project.status}</span>
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="w-full text-4xl font-bold bg-transparent border-b border-white/30 focus:border-white outline-none mb-2"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            ) : (
                                <h1 className="text-4xl font-bold mb-2 text-shadow">{project.name}</h1>
                            )}
                            {isEditing ? (
                                <div className="flex flex-col sm:flex-row gap-3 mt-2 mb-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Mulai</label>
                                        <input
                                            type="date"
                                            className="bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                            value={editForm.startDate}
                                            onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Selesai</label>
                                        <input
                                            type="date"
                                            className="bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                                            value={editForm.endDate}
                                            onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 text-slate-300 text-sm">
                                    <div className="flex items-center gap-1"><CalendarDays size={14} /> {formatDate(project.startDate)} - {formatDate(project.endDate)}</div>
                                    {project.client && <div className="flex items-center gap-1"><Users size={14} /> {project.client}</div>}
                                </div>
                            )}
                        </div>

                        {canManageProjects && (
                            <button
                                onClick={() => isEditing ? handleSaveEdit() : setIsEditing(true)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${isEditing ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md'}`}
                            >
                                {isEditing ? <><Save size={18} /> Simpan</> : <><Edit3 size={18} /> Edit Project</>}
                            </button>
                        )}
                    </div>

                    {isEditing && (
                        <div className="mt-4 flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-slate-400 block mb-1">Cover Image (URL atau Upload)</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            className="w-full bg-slate-800/50 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 pl-8"
                                            value={editForm.coverImage}
                                            onChange={e => setEditForm({ ...editForm, coverImage: e.target.value })}
                                            placeholder="https://... atau Upload"
                                        />
                                        <ImageIcon size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                                    </div>

                                    {editForm.coverImage && (
                                        <button
                                            onClick={() => startCrop(editForm.coverImage)}
                                            className="px-3 bg-slate-700 hover:bg-indigo-600 text-white rounded transition text-xs font-bold"
                                            title="Sesuaikan Posisi / Crop"
                                        >
                                            <Crop size={16} />
                                        </button>
                                    )}

                                    <div className="relative overflow-hidden">
                                        <button className="h-full px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm font-medium transition relative z-10 pointer-events-none flex items-center gap-2">
                                            <ImageIcon size={16} /> Upload
                                        </button>
                                        <input
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    if (file.size > 2000 * 1024) {
                                                        alert('Ukuran gambar maksimal 2MB');
                                                        return;
                                                    }
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        startCrop(reader.result);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-indigo-500" />
                            Deskripsi Project
                        </h3>
                        {isEditing ? (
                            <textarea
                                className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                placeholder="Tuliskan deskripsi lengkap project di sini..."
                            ></textarea>
                        ) : (
                            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                                {project.description ? project.description.split('\n').map((p, i) => <p key={i}>{p}</p>) : <p className="italic text-slate-400">Belum ada deskripsi.</p>}
                            </div>
                        )}
                    </Card>


                    {/* Interface / Application Preview Section */}
                    {(project.interfaceImage || isEditing) && (
                        <Card className="p-6 mb-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Monitor size={20} className="text-sky-500" />
                                    Interface Preview
                                </span>
                                {isEditing && (
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 transition">
                                            <Upload size={14} /> Upload
                                            <input type="file" className="hidden" accept="image/*" onChange={handleInterfaceUpload} />
                                        </label>
                                        {editForm.interfaceImage && (
                                            <button
                                                onClick={handleRemoveInterfaceImage}
                                                className="bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-2 transition"
                                            >
                                                <Trash2 size={14} /> Hapus
                                            </button>
                                        )}
                                    </div>
                                )}
                            </h3>

                            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 min-h-[200px] flex items-center justify-center group">
                                {(isEditing ? editForm.interfaceImage : project.interfaceImage) ? (
                                    <img
                                        src={isEditing ? editForm.interfaceImage : project.interfaceImage}
                                        alt="Project Interface"
                                        className="w-full h-auto object-cover max-h-[500px]"
                                    />
                                ) : (
                                    <div className="text-center p-8 text-slate-400">
                                        <Monitor size={48} className="mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">Belum ada preview interface.</p>
                                        {isEditing && <p className="text-xs mt-1">Upload gambar untuk menampilkan.</p>}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <LinkIcon size={20} className="text-indigo-500" />
                            Resources & Attachments
                        </h3>

                        <div className="space-y-3">
                            {(isEditing ? editForm.resources : project.resources || []).map(res => (
                                <div key={res.id} className="p-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-lg group">
                                    {editingResourceId === res.id ? (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <select
                                                    className="px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                                                    value={editResourceData.type}
                                                    onChange={e => setEditResourceData({ ...editResourceData, type: e.target.value })}
                                                >
                                                    <option value="link">Link</option>
                                                    <option value="file">File</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    className="flex-1 px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                                                    value={editResourceData.name}
                                                    onChange={e => setEditResourceData({ ...editResourceData, name: e.target.value })}
                                                    placeholder="Nama Resource"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                                                value={editResourceData.url}
                                                onChange={e => setEditResourceData({ ...editResourceData, url: e.target.value })}
                                                placeholder="URL"
                                            />
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                                                value={editResourceData.description}
                                                onChange={e => setEditResourceData({ ...editResourceData, description: e.target.value })}
                                                placeholder="Keterangan (Opsional)"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={handleSaveResourceEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"><Check size={16} /></button>
                                                <button onClick={handleCancelResourceEdit} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition"><X size={16} /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3 flex-1 overflow-hidden">
                                                <div className={`p-2 rounded-lg flex-shrink-0 ${res.type === 'link' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                                                    {res.type === 'link' ? <Globe size={18} /> : <FileText size={18} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-800 dark:text-white truncate" title={res.name}>{res.name}</p>
                                                    {res.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{res.description}</p>}
                                                    {res.type === 'link' ? (
                                                        <a href={res.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline flex items-center gap-1 mt-1 truncate">
                                                            {res.url} <ExternalLink size={10} />
                                                        </a>
                                                    ) : (
                                                        <span
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = res.url;
                                                                link.download = res.name;
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }}
                                                            className="text-xs text-indigo-500 hover:underline flex items-center gap-1 mt-1 cursor-pointer truncate"
                                                        >
                                                            <Download size={10} /> Download File
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isEditing && (
                                                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleEditResourceClick(res)}
                                                        className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition"
                                                        title="Edit Resource"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button onClick={() => removeResource(res.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {(isEditing ? editForm.resources : project.resources || []).length === 0 && !isEditing && (
                                <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                    Tidak ada attachment.
                                </div>
                            )}
                        </div>

                        {isEditing && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tambah Resource Baru</p>
                                <div className="flex flex-col md:flex-row gap-2">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-2">
                                            <select
                                                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                value={newResource.type}
                                                onChange={e => setNewResource({ ...newResource, type: e.target.value, url: '' })}
                                            >
                                                <option value="link">Link / URL</option>
                                                <option value="file">Upload File</option>
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Nama Resource (cth: Desain Figma)"
                                                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                                value={newResource.name}
                                                onChange={e => setNewResource({ ...newResource, name: e.target.value })}
                                            />
                                        </div>
                                        {newResource.type === 'link' ? (
                                            <input
                                                type="text"
                                                placeholder="URL / Lokasi"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                                value={newResource.url}
                                                onChange={e => setNewResource({ ...newResource, url: e.target.value })}
                                            />
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            if (file.size > 500 * 1024) {
                                                                alert('Ukuran file maksimal 500KB');
                                                                return;
                                                            }
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                setNewResource({ ...newResource, url: reader.result });
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500 truncate">
                                                    {newResource.url ? 'File berhasil dipilih' : 'Pilih File (Max 500KB)'}
                                                </div>
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            placeholder="Keterangan (Opsional)"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                            value={newResource.description}
                                            onChange={e => setNewResource({ ...newResource, description: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        onClick={addResource}
                                        disabled={!newResource.name || !newResource.url}
                                        className="self-end md:self-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-medium transition h-full flex items-center"
                                    >
                                        Tambah
                                    </button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Sub-Projects Section */}
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <ListIcon size={20} className="text-indigo-500" />
                            Sub-Projects / Tahapan
                        </h3>

                        <div className="space-y-3">
                            {localSubProjects.map((sp, index) => (
                                <div
                                    key={sp.id}
                                    draggable={isEditing}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnter={(e) => handleDragEnter(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => e.preventDefault()}
                                    className={`flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-lg group ${draggedIdx === index ? 'opacity-50 border-dashed border-indigo-500' : ''}`}
                                >
                                    {isEditing && (
                                        <div className="mr-3 cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-500">
                                            <GripVertical size={20} />
                                        </div>
                                    )}
                                    {editingSubProjectId === sp.id ? (
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 mr-2">
                                            <input
                                                type="text"
                                                className="px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                                                value={editSubProjectData.name}
                                                onChange={e => setEditSubProjectData({ ...editSubProjectData, name: e.target.value })}
                                                autoFocus
                                            />
                                            <input
                                                type="date"
                                                className="px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                                                value={editSubProjectData.startDate}
                                                onChange={e => setEditSubProjectData({ ...editSubProjectData, startDate: e.target.value })}
                                            />
                                            <input
                                                type="date"
                                                className="px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600"
                                                value={editSubProjectData.endDate}
                                                onChange={e => setEditSubProjectData({ ...editSubProjectData, endDate: e.target.value })}
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white">{sp.name}</p>
                                            <p className="text-xs text-slate-500">{formatDate(sp.startDate)} - {formatDate(sp.endDate)}</p>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        {editingSubProjectId === sp.id ? (
                                            <>
                                                <button onClick={handleSaveSubProjectEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"><Check size={16} /></button>
                                                <button onClick={handleCancelSubProjectEdit} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition"><X size={16} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xs font-medium bg-slate-200 dark:bg-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                                                    {formatDate(sp.endDate)}
                                                </span>
                                                {isEditing && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditSubProjectClick(sp)}
                                                            className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition"
                                                            title="Edit Sub-Project"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`Yakin ingin menghapus sub-project "${sp.name}"?`)) {
                                                                    onDeleteSubProject(sp.id);
                                                                }
                                                            }}
                                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                                                            title="Hapus Sub-Project"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {isEditing && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Tambah Sub-Project Baru</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-3">
                                        <input
                                            type="text"
                                            placeholder="Nama Sub-Project (cth: Pondasi)"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                            value={newSubProject.name}
                                            onChange={e => setNewSubProject({ ...newSubProject, name: e.target.value })}
                                        />
                                    </div>
                                    <input
                                        type="date"
                                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                                        value={newSubProject.startDate}
                                        onChange={e => setNewSubProject({ ...newSubProject, startDate: e.target.value })}
                                    />
                                    <input
                                        type="date"
                                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                                        value={newSubProject.endDate}
                                        onChange={e => setNewSubProject({ ...newSubProject, endDate: e.target.value })}
                                    />
                                    <button
                                        onClick={handleAddSubProjectClick}
                                        className="md:col-span-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} /> Tambah
                                    </button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Informasi Detail</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Klien</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm"
                                        value={editForm.client}
                                        onChange={e => setEditForm({ ...editForm, client: e.target.value })}
                                    />
                                ) : (
                                    <p className="font-medium text-slate-800 dark:text-white">{project.client || '-'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Budget Project</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm"
                                        value={editForm.budget}
                                        onChange={e => setEditForm({ ...editForm, budget: e.target.value })}
                                    />
                                ) : (
                                    <p className="font-medium text-slate-800 dark:text-white">{project.budget || '-'}</p>
                                )}
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="text-xs text-slate-400 block mb-1">Durasi</label>
                                <p className="font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                    <Clock size={16} className="text-slate-400" />
                                    {Math.ceil((new Date(project.endDate) - new Date(project.startDate)) / (1000 * 60 * 60 * 24))} Hari
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 border-none text-white">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white/20 rounded-lg">
                                <BarChart3 size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Project Health: {healthStatus}</h3>
                                <p className="text-white/80 text-sm mt-1">{healthMessage}</p>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/20">
                            <div className="flex justify-between text-sm mb-2">
                                <span>Progress (Realization)</span>
                                <span className="font-bold">{progressPercentage}%</span>
                            </div>
                            <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`${healthColor} h-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.3)]`}
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-white/60 mt-2">
                                <span>{completedTasks} Selesai</span>
                                <span>{totalTasks} Total Tugas</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
