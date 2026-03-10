export const INITIAL_USERS = [];

export const INITIAL_PROJECTS = [];

export const INITIAL_SUBPROJECTS = [];

export const INITIAL_TASKS = [];

export const STATUS_CONFIG = {
    todo: { label: 'Akan Dikerjakan', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    'in-progress': { label: 'Sedang Proses', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    review: { label: 'Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    done: { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

export const PRIORITY_CONFIG = {
    high: { label: 'Tinggi', color: 'text-red-600 bg-red-100' },
    medium: { label: 'Sedang', color: 'text-amber-600 bg-amber-100' },
    low: { label: 'Rendah', color: 'text-blue-600 bg-blue-100' }
};

export const INITIAL_ROLES = [
    {
        id: 'r1',
        name: 'Project Manager',
        color: 'bg-indigo-500',
        permissions: {
            canManageTeam: true,
            canManageProjects: true,
            canManageTasks: true,
            canManageRoles: true,
            canDeleteTasks: true,
            canDeleteProjects: true
        }
    },
    {
        id: 'r2',
        name: 'Senior Developer',
        color: 'bg-blue-500',
        permissions: {
            canManageTeam: false,
            canManageProjects: false,
            canManageTasks: true,
            canManageRoles: false,
            canDeleteTasks: false,
            canDeleteProjects: false
        }
    },
    {
        id: 'r3',
        name: 'Frontend Dev',
        color: 'bg-pink-500',
        permissions: {
            canManageTeam: false,
            canManageProjects: false,
            canManageTasks: true,
            canManageRoles: false,
            canDeleteTasks: false,
            canDeleteProjects: false
        }
    },
    {
        id: 'r4',
        name: 'Backend Dev',
        color: 'bg-green-500',
        permissions: {
            canManageTeam: false,
            canManageProjects: false,
            canManageTasks: true,
            canManageRoles: false,
            canDeleteTasks: false,
            canDeleteProjects: false
        }
    },
    {
        id: 'r5',
        name: 'UI/UX Designer',
        color: 'bg-purple-500',
        permissions: {
            canManageTeam: false,
            canManageProjects: false,
            canManageTasks: true,
            canManageRoles: false,
            canDeleteTasks: false,
            canDeleteProjects: false
        }
    }
];
