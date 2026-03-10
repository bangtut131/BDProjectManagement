import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '../data/constants';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktobe', 'November', 'Desember'
];

export const CalendarView = ({ tasks, projects, onEditTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const renderCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month); // 0 = Sunday
        const daysInPrevMonth = getDaysInMonth(year, month - 1);

        const days = [];

        // Previous month padding
        for (let i = 0; i < firstDay; i++) {
            days.push({
                day: daysInPrevMonth - firstDay + i + 1,
                month: month - 1,
                year: month === 0 ? year - 1 : year,
                currentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                month: month,
                year: year,
                currentMonth: true
            });
        }

        // Next month padding
        const remainingCells = 42 - days.length; // 6 rows * 7 cols
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                day: i,
                month: month + 1,
                year: month === 11 ? year + 1 : year,
                currentMonth: false
            });
        }

        return days;
    };

    const calendarDays = renderCalendarDays();

    const getTasksForDate = (dateObj) => {
        // Create query date string YYYY-MM-DD (local time)
        // Note: This matches the format used in standard inputs which is usually how we store it (YYYY-MM-DD from input type='date')
        // If stored as ISO string with time, we need to be careful. 
        // Based on previous code: new Date().toISOString().split('T')[0]

        // Construct date string manually to match our storage format (YYYY-MM-DD)
        const m = dateObj.month + 1; // 0-indexed to 1-indexed
        const d = dateObj.day;
        const dateStr = `${dateObj.year}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

        return tasks.filter(t => t.dueDate.startsWith(dateStr));
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <CalendarIcon className="text-indigo-600" />
                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded-md shadow-sm transition">
                            <ChevronLeft size={18} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <button onClick={handleToday} className="px-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 rounded-md transition mx-1">
                            Hari Ini
                        </button>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded-md shadow-sm transition">
                            <ChevronRight size={18} className="text-slate-600 dark:text-slate-300" />
                        </button>
                    </div>
                </div>
                {/* Legend / Filter could go here */}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
                    {DAYS.map(day => (
                        <div key={day} className="p-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr h-full min-h-[600px]">
                    {calendarDays.map((dateObj, index) => {
                        const dayTasks = getTasksForDate(dateObj);
                        const isToday =
                            dateObj.day === new Date().getDate() &&
                            dateObj.month === new Date().getMonth() &&
                            dateObj.year === new Date().getFullYear();

                        return (
                            <div
                                key={index}
                                className={`min-h-[100px] border-b border-r border-slate-100 dark:border-slate-700/50 p-2 transition hover:bg-slate-50 dark:hover:bg-slate-700/30
                                ${!dateObj.currentMonth ? 'bg-slate-50/50 dark:bg-slate-900/50 text-slate-400' : 'bg-white dark:bg-slate-800'}
                            `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                    ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-700 dark:text-slate-300'}
                                `}>
                                        {dateObj.day}
                                    </span>
                                    {dayTasks.length > 0 && (
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 rounded-full">
                                            {dayTasks.length}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1">
                                    {dayTasks.map(task => (
                                        <button
                                            key={task.id}
                                            onClick={() => onEditTask(task)}
                                            className={`text-left p-1.5 rounded text-[10px] font-medium border-l-2 shadow-sm transition hover:-translate-y-0.5
                                            ${task.status === 'done' ? 'bg-slate-100 dark:bg-slate-700 border-slate-400 text-slate-500 line-through opacity-70' :
                                                    'bg-white dark:bg-slate-700 border-indigo-500 text-slate-700 dark:text-slate-200'}
                                        `}
                                        >
                                            <div className="line-clamp-1">{task.title}</div>
                                            {task.priority === 'high' && (
                                                <div className="flex items-center gap-1 mt-0.5 text-red-500">
                                                    <Clock size={8} /> <span className="text-[9px]">High</span>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
