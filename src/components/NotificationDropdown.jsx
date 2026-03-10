import { Bell, CheckCircle2, AlertCircle, Clock, X } from 'lucide-react';
import { formatDate } from '../lib/utils';
// Assuming utils exist, if not we keep it simple

export const NotificationDropdown = ({ notifications, onMarkAsRead, onClose, onSelect }) => {
    // Determine active content
    const hasNotifications = notifications && notifications.length > 0;

    return (
        <>
            <div className="absolute top-12 right-0 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-white">Notifikasi</h3>
                        {hasNotifications && (
                            <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full font-bold">
                                {notifications.filter(n => !n.read).length}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 items-center">
                        {hasNotifications && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onMarkAsRead) onMarkAsRead();
                                }}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium mr-2"
                            >
                                Tandai dibaca
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent bubbling
                                onClose();
                            }}
                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1 transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {!hasNotifications ? (
                        <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm flex flex-col items-center">
                            <Bell size={32} className="mb-3 opacity-20" />
                            <p>Tidak ada notifikasi baru</p>
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => onSelect && onSelect(notif)}
                                className={`p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex gap-3 cursor-pointer ${!notif.read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                            >
                                <div className={`mt-1 min-w-[32px] h-8 rounded-full flex items-center justify-center shrink-0
                                ${notif.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                        notif.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                                            'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}
                                >
                                    {notif.type === 'alert' ? <AlertCircle size={16} /> :
                                        notif.type === 'warning' ? <Clock size={16} /> :
                                            <CheckCircle2 size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-0.5 truncate">{notif.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mb-1.5 line-clamp-2">
                                        {notif.message}
                                    </p>
                                    <div className="text-[10px] text-slate-400">
                                        {/* Simple fallback date formatting */}
                                        {new Date(notif.date).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};
