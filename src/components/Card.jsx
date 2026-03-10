export const Card = ({ children, className = '', ...props }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`} {...props}>
        {children}
    </div>
);
