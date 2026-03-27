import { LayoutDashboard, CheckCircle2, Clock, AlertCircle, BarChart3, CalendarDays, Lock } from 'lucide-react';
import { Card } from './Card';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../data/constants';
import { formatDate } from '../lib/utils';

export const DashboardView = ({ tasks, projects, subProjects, selectedProjectId }) => {
    const filteredTasks = selectedProjectId === 'all'
        ? tasks
        : tasks.filter(t => {
            const projectSubIds = (subProjects || []).filter(sp => sp.projectId === selectedProjectId).map(sp => sp.id);
            return projectSubIds.includes(t.subProjectId);
        });

    const stats = {
        total: filteredTasks.length,
        completed: filteredTasks.filter(t => t.status === 'done').length,
        inProgress: filteredTasks.filter(t => t.status === 'in-progress').length,
        todo: filteredTasks.filter(t => t.status === 'todo').length,
    };

    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    // Calculate per-project progress from actual task data
    const getProjectProgress = (projectId) => {
        const projectSubIds = (subProjects || []).filter(sp => sp.projectId === projectId).map(sp => sp.id);
        const projectTasks = tasks.filter(t => projectSubIds.includes(t.subProjectId));
        if (projectTasks.length === 0) return { total: 0, done: 0, pct: 0 };
        const done = projectTasks.filter(t => t.status === 'done').length;
        return { total: projectTasks.length, done, pct: Math.round((done / projectTasks.length) * 100) };
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {selectedProjectId === 'all' ? 'Ringkasan semua project' : projects.find(p => p.id === selectedProjectId)?.name}
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 border-l-4 border-l-indigo-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Tugas</p>
                            <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{stats.total}</h3>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <LayoutDashboard size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-emerald-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Selesai</p>
                            <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{stats.completed}</h3>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sedang Proses</p>
                            <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{stats.inProgress}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Clock size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-amber-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Akan Dikerjakan</p>
                            <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{stats.todo}</h3>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                            <AlertCircle size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progress Chart Simple */}
                <Card className="lg:col-span-2 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Progress Penyelesaian</h3>
                    <div className="relative h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
                            style={{ width: `${completionRate}%` }}
                        ></div>
                    </div>
                    <div className="mt-4 flex justify-between text-sm text-slate-500 dark:text-slate-400">
                        <span>0%</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{completionRate}% Selesai</span>
                        <span>100%</span>
                    </div>

                    <div className="mt-8 space-y-4">
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Distribusi Prioritas</h4>
                        <div className="flex gap-4">
                            {Object.keys(PRIORITY_CONFIG).map(p => {
                                const count = filteredTasks.filter(t => t.priority === p).length;
                                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                return (
                                    <div key={p} className="flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="capitalize">{PRIORITY_CONFIG[p].label}</span>
                                            <span>{count}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className={`h-full ${p === 'high' ? 'bg-red-500' : p === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </Card>

                {/* Project List with REAL progress */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Project Aktif</h3>
                    <div className="space-y-3">
                        {projects.map(p => {
                            const progress = getProjectProgress(p.id);
                            return (
                                <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-slate-800 dark:text-slate-200">{p.name}</h4>
                                            {p.is_private && (
                                                <div className="flex items-center text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800" title="Proyek Private">
                                                    <Lock size={10} className="mr-1" />Private
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Active</span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-2">
                                        <CalendarDays size={12} />
                                        {formatDate(p.startDate)} - {formatDate(p.endDate)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-slate-200 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    progress.pct === 100 ? 'bg-emerald-500' :
                                                    progress.pct >= 50 ? 'bg-indigo-500' :
                                                    progress.pct > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-500'
                                                }`}
                                                style={{ width: `${Math.max(progress.pct, 0)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 min-w-[36px] text-right">
                                            {progress.total > 0 ? `${progress.done}/${progress.total}` : '—'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
};
