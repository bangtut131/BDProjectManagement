export const Badge = ({ children, className }) => (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${className}`}>
        {children}
    </span>
);
