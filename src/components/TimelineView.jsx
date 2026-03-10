import { useMemo, useRef, useState, useEffect } from 'react';
import { FolderOpen, Layers } from 'lucide-react';
import { Card } from './Card';
import { STATUS_CONFIG } from '../data/constants';

export const TimelineView = ({ tasks, projects, subProjects, selectedProjectId }) => {
    const visibleProjects = selectedProjectId === 'all'
        ? projects
        : projects.filter(p => p.id === selectedProjectId);

    // Determine date range for display based on visible projects
    const today = new Date();

    // Default fallback
    let startVal = new Date(today.getFullYear(), today.getMonth(), 1);
    let endVal = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    const validStartDates = visibleProjects
        .map(p => p.startDate ? new Date(p.startDate) : null)
        .filter(d => d && !isNaN(d.getTime()));

    const validEndDates = visibleProjects
        .map(p => p.endDate ? new Date(p.endDate) : null)
        .filter(d => d && !isNaN(d.getTime()));

    if (validStartDates.length > 0) {
        startVal = new Date(Math.min(...validStartDates));
    }

    if (validEndDates.length > 0) {
        endVal = new Date(Math.max(...validEndDates));
    }

    // Buffer: Snap to start/end of month
    const startDate = new Date(startVal.getFullYear(), startVal.getMonth(), 1);
    const endDate = new Date(endVal.getFullYear(), endVal.getMonth() + 1, 0);

    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
    }

    // Calculate Months for Header
    const months = useMemo(() => {
        const ms = [];
        days.forEach(day => {
            const monthKey = `${day.getFullYear()}-${day.getMonth()}`;
            if (ms.length === 0 || ms[ms.length - 1].key !== monthKey) {
                ms.push({
                    key: monthKey,
                    label: day.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
                    count: 1
                });
            } else {
                ms[ms.length - 1].count++;
            }
        });
        return ms;
    }, [days]); // Re-calc when days change

    const getPos = (dateStr) => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 0;
        const diffTime = d - startDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const topScrollRef = useRef(null);
    const bottomScrollRef = useRef(null);
    const isSyncingTop = useRef(false);
    const isSyncingBottom = useRef(false);

    const handleScrollTop = (e) => {
        if (isSyncingTop.current) {
            isSyncingTop.current = false;
            return;
        }
        if (bottomScrollRef.current) {
            isSyncingBottom.current = true;
            bottomScrollRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const handleScrollBottom = (e) => {
        if (isSyncingBottom.current) {
            isSyncingBottom.current = false;
            return;
        }
        if (topScrollRef.current) {
            isSyncingTop.current = true;
            topScrollRef.current.scrollLeft = e.target.scrollLeft;
        }
    };

    const contentWidth = 256 + (days.length * 40);

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700 dark:text-white">Project Timeline</h3>
                <div className="text-xs text-slate-500 flex gap-2">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-indigo-500 rounded-sm"></div> Project</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded-sm"></div> Sub Project</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-400 rounded-sm"></div> Task</span>
                </div>
            </div>

            <div
                ref={topScrollRef}
                className="overflow-x-auto overflow-y-hidden custom-scrollbar bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0"
                style={{ minHeight: '12px' }}
                onScroll={handleScrollTop}
            >
                <div style={{ width: `${contentWidth}px`, height: '1px' }}></div>
            </div>

            <div
                ref={bottomScrollRef}
                className="flex-1 overflow-auto relative custom-scrollbar"
                onScroll={handleScrollBottom}
                id="timeline-bottom-scroll"
            >
                <div className="min-w-full w-max">
                    {/* Calendar Header */}
                    <div className="sticky top-0 z-50 bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
                        <div className="flex">
                            <div className="w-64 flex-shrink-0 p-3 font-semibold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 flex items-end pb-2 sticky left-0 z-60 bg-white dark:bg-slate-800" style={{ left: 0 }}>
                                Item
                            </div>
                            <div className="flex-1">
                                {/* Months Row */}
                                <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                    {months.map((m, i) => (
                                        <div
                                            key={i}
                                            className="py-1 px-2 text-xs font-bold text-slate-500 dark:text-slate-400 border-r border-slate-200/50 dark:border-slate-700 text-center truncate"
                                            style={{ width: `${m.count * 40}px`, minWidth: `${m.count * 40}px` }}
                                        >
                                            {m.label}
                                        </div>
                                    ))}
                                </div>
                                {/* Days Row */}
                                <div className="flex">
                                    {days.map((day, i) => (
                                        <div key={i} className={`w-[40px] min-w-[40px] max-w-[40px] text-center text-xs p-2 border-r border-slate-100 dark:border-slate-700 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                                            <div className="font-bold text-slate-500">{day.getDate()}</div>
                                            <div className="text-[10px] text-slate-400">{day.toLocaleDateString('id-ID', { weekday: 'short' })}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Body */}
                    <div className="pb-4">
                        {visibleProjects.map(project => (
                            <div key={project.id}>
                                {/* Project Row */}
                                <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                                    <div className="w-64 flex-shrink-0 p-3 pl-4 border-r border-slate-200 dark:border-slate-700 font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 sticky left-0 z-40 bg-slate-50 dark:bg-slate-800" style={{ left: 0 }}>
                                        <FolderOpen size={16} />
                                        {project.name}
                                    </div>
                                    <div className="flex-1 relative h-10">
                                        {/* Project Bar */}
                                        <div
                                            className="absolute h-5 top-2.5 rounded bg-indigo-500/80 text-white text-xs flex items-center px-2 truncate shadow-sm z-10"
                                            style={{
                                                left: `${Math.max(0, getPos(project.startDate)) * 40}px`,
                                                width: `${Math.max(40, (getPos(project.endDate) - getPos(project.startDate)) * 40)}px`
                                            }}
                                        >
                                            {project.name}
                                        </div>
                                        {/* Grid Lines */}
                                        {days.map((_, i) => <div key={i} className="absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-700/50" style={{ left: `${(i + 1) * 40}px` }}></div>)}
                                    </div>
                                </div>

                                {/* Sub Projects */}
                                {subProjects.filter(sp => sp.projectId === project.id).map(sub => (
                                    <div key={sub.id}>
                                        <div className="flex border-b border-slate-100 dark:border-slate-700">
                                            <div className="w-64 flex-shrink-0 p-3 pl-8 border-r border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 sticky left-0 z-40 bg-white dark:bg-slate-900" style={{ left: 0 }}>
                                                <Layers size={14} />
                                                {sub.name}
                                            </div>
                                            <div className="flex-1 relative h-10">
                                                <div
                                                    className="absolute h-4 top-3 rounded-full bg-blue-400/80 text-white text-[10px] flex items-center px-2 truncate"
                                                    style={{
                                                        left: `${Math.max(0, getPos(sub.startDate)) * 40}px`,
                                                        width: `${Math.max(40, (getPos(sub.endDate) - getPos(sub.startDate)) * 40)}px`
                                                    }}
                                                >
                                                </div>
                                                {days.map((_, i) => <div key={i} className="absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-700/50" style={{ left: `${(i + 1) * 40}px` }}></div>)}
                                            </div>
                                        </div>

                                        {/* Tasks */}
                                        {tasks.filter(t => t.subProjectId === sub.id).map(task => (
                                            <div key={task.id} className="flex border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <div className="w-64 flex-shrink-0 p-2 pl-12 border-r border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between sticky left-0 z-40 bg-white dark:bg-slate-900" style={{ left: 0 }}>
                                                    <span>{task.title}</span>
                                                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[task.status].color.split(' ')[0].replace('bg-', 'bg-')}`}></span>
                                                </div>
                                                <div className="flex-1 relative h-8">
                                                    <div
                                                        className={`absolute h-3 top-2.5 rounded-sm ${task.status === 'done' ? 'bg-emerald-400' : 'bg-slate-400'} opacity-80`}
                                                        style={{
                                                            left: `${Math.max(0, getPos(task.startDate)) * 40}px`,
                                                            width: `${Math.max(40, (getPos(task.dueDate) - getPos(task.startDate)) * 40)}px`
                                                        }}
                                                    ></div>
                                                    {days.map((_, i) => <div key={i} className="absolute top-0 bottom-0 border-r border-slate-50 dark:border-slate-800" style={{ left: `${(i + 1) * 40}px` }}></div>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
};
