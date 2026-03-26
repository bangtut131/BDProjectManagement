import { FolderOpen, Layers, Clock } from 'lucide-react';
import { Avatar } from './Avatar';
import { STATUS_CONFIG } from '../data/constants';
import { formatDate } from '../lib/utils';

export const KanbanView = ({ tasks, users, subProjects, projects, selectedProjectId, onStatusChange, onEditTask, currentUser, userPermissions }) => {

    // Permission Check
    const canManageTasks = userPermissions?.canManageTasks;
    const canMoveTasks = canManageTasks && currentUser?.role !== 'Pengunjung';

    const handleDragStart = (e, taskId) => {
        if (!canMoveTasks) return;
        e.dataTransfer.setData('taskId', taskId);
    };

    const handleDragOver = (e) => {
        if (!canMoveTasks) return;
        e.preventDefault();
    };

    const handleDrop = (e, status) => {
        if (!canMoveTasks) return;
        const taskIdStr = e.dataTransfer.getData('taskId');
        if (!taskIdStr) return;
        
        // Parse explicitly to Number because dataTransfer stores strings
        // However, if your DB uses UUIDs, you shouldn't parse. But this uses SERIAL integers.
        const taskId = parseInt(taskIdStr, 10);
        onStatusChange(taskId, status);
    };

    const getSubProjectName = (subId) => {
        const sp = subProjects.find(s => s.id === subId);
        return sp ? sp.name : 'Unknown SubProject';
    };

    // Helper to render tasks, grouping them if 'all' is selected
    const renderTasksInColumn = (statusKey) => {
        const tasksInStatus = tasks.filter(t => t.status === statusKey);

        if (selectedProjectId === 'all') {
            // Group tasks by Project
            const groupedTasks = {};
            projects.forEach(proj => {
                groupedTasks[proj.id] = [];
            });
            // Also handle unknown/other projects if any data inconsistency
            groupedTasks['other'] = [];

            tasksInStatus.forEach(task => {
                const sp = subProjects.find(s => s.id === task.subProjectId);
                if (sp && groupedTasks[sp.projectId]) {
                    groupedTasks[sp.projectId].push(task);
                } else {
                    groupedTasks['other'].push(task);
                }
            });

            return (
                <div className="space-y-4">
                    {projects.map(proj => {
                        const projTasks = groupedTasks[proj.id];
                        if (projTasks.length === 0) return null;
                        return (
                            <div key={proj.id} className="space-y-2">
                                <div className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm py-1 px-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide border-b border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1 rounded">
                                    <FolderOpen size={10} />
                                    {proj.name}
                                </div>
                                {projTasks.map(task => renderTaskCard(task))}
                            </div>
                        );
                    })}
                    {groupedTasks['other'].length > 0 && (
                        <div className="space-y-2">
                            <div className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm py-1 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-200 flex items-center gap-1 rounded">
                                <FolderOpen size={10} />
                                Lainnya
                            </div>
                            {groupedTasks['other'].map(task => renderTaskCard(task))}
                        </div>
                    )}
                    {tasksInStatus.length === 0 && renderEmptyState()}
                </div>
            );
        }

        // Normal rendering for single project
        if (tasksInStatus.length === 0) return renderEmptyState();
        return (
            <div className="space-y-3">
                {tasksInStatus.map(task => renderTaskCard(task))}
            </div>
        );
    };

    const renderTaskCard = (task) => {
        const taskAssignees = (task.assignees || (task.assignee ? [task.assignee] : []))
            .map(uid => users.find(u => u.id === uid))
            .filter(Boolean);
        const maxVisible = 3;
        const visibleAssignees = taskAssignees.slice(0, maxVisible);
        const overflow = taskAssignees.length - maxVisible;

        return (
            <div
                key={task.id}
                draggable={canMoveTasks}
                onDragStart={(e) => handleDragStart(e, task.id)}
                onClick={() => canManageTasks && onEditTask(task)}
                className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition group ${canMoveTasks ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700' : 'cursor-default opacity-90'}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <Layers size={10} />
                        {getSubProjectName(task.subProjectId)}
                    </span>
                    <div className="flex items-center gap-1.5">
                        {task.status === 'review' && (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 px-1.5 py-0.5 rounded animate-pulse shadow-sm" title="Menunggu Persetujuan Manager">
                                REVIEW PM
                            </span>
                        )}
                        {task.priority === 'high' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                    </div>
                </div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 line-clamp-2">{task.title}</h4>

                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center -space-x-2">
                        {visibleAssignees.map((u, i) => (
                            <div key={u.id} className="ring-2 ring-white dark:ring-slate-800 rounded-full" style={{ zIndex: maxVisible - i }} title={u.name}>
                                <Avatar user={u} size="sm" />
                            </div>
                        ))}
                        {overflow > 0 && (
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-600 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                +{overflow}
                            </div>
                        )}
                        {taskAssignees.length === 0 && <Avatar user={null} size="sm" />}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={12} />
                        <span>{formatDate(task.dueDate)}</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderEmptyState = () => (
        <div className="h-24 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
            Kosong
        </div>
    );

    return (
        <div className="h-full overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-[1000px] h-full">
                {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                    <div
                        key={statusKey}
                        className="flex-1 min-w-[280px] flex flex-col h-full bg-slate-100/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-700/50"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, statusKey)}
                    >
                        <div className={`p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center rounded-t-xl ${config.color.split(' ')[0]}`}>
                            <h3 className={`font-semibold ${config.color.split(' ')[1]}`}>{config.label}</h3>
                            <span className="text-xs font-bold bg-white/50 px-2 py-1 rounded-full">
                                {tasks.filter(t => t.status === statusKey).length}
                            </span>
                        </div>

                        <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
                            {renderTasksInColumn(statusKey)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
