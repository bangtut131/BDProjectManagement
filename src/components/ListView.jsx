import { useState, useRef, useEffect } from 'react'; // Added Hooks
import { Search, Layers, MoreVertical, Trash2, GripVertical, ChevronDown, ChevronRight, Briefcase } from 'lucide-react'; // Added Icons
import { Card } from './Card';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../data/constants';
import { formatDate } from '../lib/utils';

export const ListView = ({ tasks, users, subProjects, projects = [], onEditTask, onDeleteTask, onUpdateProjectOrder, onUpdateTaskOrder, currentUser, userPermissions }) => {
    // Permission Check
    const canManageTasks = userPermissions?.canManageTasks;

    const [filterText, setFilterText] = useState('');
    const [localProjects, setLocalProjects] = useState([]);
    const [localTasks, setLocalTasks] = useState([]);
    const [expandedProjects, setExpandedProjects] = useState({}); // { pid: true/false }

    // Drag & Drop Refs
    const dragItem = useRef();
    const dragOverItem = useRef();
    const dragType = useRef(null); // 'project' or 'task'

    // Init Local Projects (sync with props)
    useEffect(() => {
        if (projects) {
            setLocalProjects([...projects].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
            // Auto expand all on load
            const initialExpanded = {};
            projects.forEach(p => initialExpanded[p.id] = true);
            setExpandedProjects(prev => ({ ...initialExpanded, ...prev }));
        }
    }, [projects]);

    // Init Local Tasks
    useEffect(() => {
        if (tasks) {
            setLocalTasks([...tasks].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
        }
    }, [tasks]);

    const toggleExpand = (pid) => {
        setExpandedProjects(prev => ({ ...prev, [pid]: !prev[pid] }));
    };

    const getSubProjectName = (subId) => {
        const sp = subProjects.find(s => s.id === subId);
        return sp ? sp.name : '';
    };

    const filteredTasks = localTasks.filter(t =>
        t.title.toLowerCase().includes(filterText.toLowerCase()) ||
        getSubProjectName(t.subProjectId).toLowerCase().includes(filterText.toLowerCase())
    );

    // D&D Handlers
    const handleDragStart = (e, position, type) => {
        e.stopPropagation(); // Prevent bubbling (Project Card vs Task Row)
        dragItem.current = position;
        dragType.current = type;
        e.dataTransfer.effectAllowed = "move";
    };

    // Use DragOver for continuous reordering
    const handleDragOver = (e, position, type) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent bubbling
        e.dataTransfer.dropEffect = "move";

        if (dragType.current !== type) return;

        const draggedPos = dragItem.current;
        const overPos = position;

        // Optimization: Don't reorder if position hasn't changed
        if (draggedPos === undefined || overPos === undefined || draggedPos === overPos) return;

        // Save reference to prevent flickering if we are already over this item
        if (dragOverItem.current === overPos) return;
        dragOverItem.current = overPos;

        if (type === 'project') {
            const newProjects = [...localProjects];
            const draggedContent = newProjects[draggedPos];

            // Remove
            newProjects.splice(draggedPos, 1);
            // Insert
            newProjects.splice(overPos, 0, draggedContent);

            dragItem.current = overPos; // Update internal ref to new index
            setLocalProjects(newProjects);
        } else if (type === 'task') {
            // position is ID for tasks
            const draggedId = draggedPos;
            const overId = overPos;

            const newTasks = [...localTasks];
            const fromIndex = newTasks.findIndex(t => t.id === draggedId);
            const toIndex = newTasks.findIndex(t => t.id === overId);

            if (fromIndex < 0 || toIndex < 0) return;

            const draggedContent = newTasks[fromIndex];
            newTasks.splice(fromIndex, 1);
            newTasks.splice(toIndex, 0, draggedContent);

            setLocalTasks(newTasks);
            // Note: For tasks, we use ID, so dragItem.current remains the ID (which is correct).
            // But wait, finding index every time is okay for small lists.
        }
    };

    const handleDragEnd = () => {
        dragItem.current = null;
        dragOverItem.current = null;
        dragType.current = null;

        if (onUpdateProjectOrder) {
            onUpdateProjectOrder(localProjects);
        }
        if (onUpdateTaskOrder) {
            onUpdateTaskOrder(localTasks);
        }
    };

    return (
        <Card className="overflow-hidden h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50 border-none shadow-none">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-4 bg-white dark:bg-slate-800 rounded-t-xl mx-0"> {/* Adjusted Styling */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Cari tugas di semua project..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-0 space-y-4"> {/* Added spacing for groups */}
                {localProjects.map((project, index) => {
                    // Filter tasks for this project
                    const projectTasks = filteredTasks.filter(t => {
                        const sp = subProjects.find(s => s.id === t.subProjectId);
                        return sp && sp.projectId === project.id;
                    });

                    // Hide empty projects if filtering, otherwise show all to allow D&D
                    if (filterText && projectTasks.length === 0) return null;

                    return (
                        <div
                            key={project.id}
                            className="bg-white dark:bg-slate-800 border-y md:border border-slate-200 dark:border-slate-700 md:rounded-xl overflow-hidden shadow-sm"
                            draggable={!filterText && canManageTasks} // Disable drag when filtering or no permission
                            onDragStart={(e) => handleDragStart(e, index, 'project')}
                            onDragOver={(e) => handleDragOver(e, index, 'project')}
                            onDragEnd={handleDragEnd}
                        >
                            {/* Project Header */}
                            <div
                                className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 transition ${canManageTasks ? 'cursor-move hover:bg-slate-100 dark:hover:bg-slate-700/50' : ''} select-none`}
                                onClick={() => toggleExpand(project.id)}
                            >
                                {canManageTasks && (
                                    <div className="text-slate-400 cursor-grab active:cursor-grabbing">
                                        <GripVertical size={18} />
                                    </div>
                                )}
                                <div className="p-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400">
                                    <Briefcase size={16} />
                                </div>
                                <h3 className="flex-1 font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
                                    {project.name}
                                    <span className="ml-2 text-xs font-normal text-slate-500 lowercase normal-case bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                        {projectTasks.length} Tugas
                                    </span>
                                </h3>
                                <div className="text-slate-400">
                                    {expandedProjects[project.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </div>
                            </div>

                            {/* Tasks Table */}
                            {expandedProjects[project.id] && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <table className="w-full text-left text-sm">
                                        {/* Header omitted to save space per group, or keep it? Keeping it for clarity per group */}
                                        <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-2 w-1/3">Tugas</th>
                                                <th className="px-4 py-2">Sub</th>
                                                <th className="px-4 py-2">Status</th>
                                                <th className="px-4 py-2">Prioritas</th>
                                                <th className="px-4 py-2">Assignee</th>
                                                <th className="px-4 py-2">Tenggat</th>
                                                {canManageTasks && <th className="px-4 py-2 text-right">Aksi</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {projectTasks.map(task => {
                                                const assignee = users.find(u => u.id === task.assignee);
                                                return (
                                                    <tr
                                                        key={task.id}
                                                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition group ${canManageTasks ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                                        draggable={!filterText && canManageTasks}
                                                        onDragStart={(e) => handleDragStart(e, task.id, 'task')}
                                                        onDragOver={(e) => handleDragOver(e, task.id, 'task')}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <td className="p-4 font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                                            {canManageTasks && (
                                                                <div className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                                                                    <GripVertical size={14} />
                                                                </div>
                                                            )}
                                                            <div>
                                                                {task.title}
                                                                <div className="text-[10px] text-slate-400 md:hidden mt-1">{formatDate(task.dueDate)}</div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-slate-500 text-xs">
                                                            {getSubProjectName(task.subProjectId)}
                                                        </td>
                                                        <td className="p-4">
                                                            <Badge className={`${STATUS_CONFIG[task.status].color} scale-90 origin-left`}>
                                                                {STATUS_CONFIG[task.status].label}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className={`flex items-center gap-1.5 ${PRIORITY_CONFIG[task.priority].color} text-xs`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                                                {PRIORITY_CONFIG[task.priority].label}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            {assignee && (
                                                                <div className="flex items-center gap-2" title={assignee.name}>
                                                                    <Avatar user={assignee} size="xs" />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-slate-600 dark:text-slate-400 text-xs">
                                                            {formatDate(task.dueDate)}
                                                        </td>
                                                        {canManageTasks && (
                                                            <td className="p-4 text-right">
                                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => onEditTask(task)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
                                                                        <MoreVertical size={14} />
                                                                    </button>
                                                                    <button onClick={() => onDeleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                            {projectTasks.length === 0 && (
                                                <tr>
                                                    <td colSpan={canManageTasks ? "7" : "6"} className="p-8 text-center text-slate-400 italic text-xs">
                                                        Belum ada tugas di project ini
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};
