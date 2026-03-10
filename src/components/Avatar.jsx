export const Avatar = ({ user, size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base',
        xl: 'w-20 h-20 text-3xl'
    };

    const sizeClass = sizeClasses[size] || sizeClasses.md;

    if (!user) return <div className={`${sizeClass} rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-white`}>?</div>;

    const isImage = user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:'));

    if (isImage) {
        return (
            <img
                src={user.avatar}
                alt={user.name}
                className={`${sizeClass} rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-800 bg-slate-100`}
            />
        );
    }

    return (
        <div className={`${sizeClass} rounded-full ${user.color || 'bg-indigo-500'} flex items-center justify-center text-white font-semibold shadow-sm ring-2 ring-white dark:ring-slate-800`}>
            {user.avatar ? user.avatar.substring(0, 2).toUpperCase() : '?'}
        </div>
    );
};
