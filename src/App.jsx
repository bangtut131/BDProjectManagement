import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  KanbanSquare,
  ListTodo,
  BarChart3,
  Users,
  Settings,
  Plus,
  Bell,
  Moon,
  Sun,
  ChevronRight,
  ChevronDown,
  Info,
  Trash2,
  PlusCircle,
  CalendarDays,
  LogOut,
  X,
  AlertCircle,
  Clock,
  MessageSquare,
  Calendar,
  Menu
} from 'lucide-react';

import { INITIAL_ROLES, STATUS_CONFIG, PRIORITY_CONFIG } from './data/constants';
import { ProjectModal } from './components/ProjectModal';
import { TaskModal } from './components/TaskModal';
import { CalendarView } from './components/CalendarView';

// Views
import { DashboardView } from './components/DashboardView';
import { OverviewView } from './components/OverviewView';
import { TimelineView } from './components/TimelineView';
import { KanbanView } from './components/KanbanView';
import { ListView } from './components/ListView';
import { TeamView } from './components/TeamView';
import { NotificationDropdown } from './components/NotificationDropdown';
import { SettingsModal } from './components/SettingsModal';
import { LoginView } from './components/LoginView';
import { supabase } from './lib/supabaseClient';

import logoBd from './assets/logo_bd.png';

const NavItem = ({ id, icon: Icon, label, activeView, setActiveView, onNavigate }) => (
  <button
    onClick={() => { setActiveView(id); if (onNavigate) onNavigate(); }}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 
      ${activeView === id
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
        : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
      }`}
  >
    <Icon size={20} />
    <span>{label}</span>
    {activeView === id && <ChevronRight size={16} className="ml-auto opacity-50" />}
  </button>
);

const App = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data States
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [subProjects, setSubProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(INITIAL_ROLES);

  const [currentUser, setCurrentUser] = useState(null);
  const isAuthenticated = !!currentUser;

  // Permissions Logic
  const userRoleObj = roles.find(r => r.name === currentUser?.role);
  const isSuperAdmin = currentUser?.email === 'admin@bd.com';
  const userPermissions = isSuperAdmin ?
    { canManageTeam: true, canManageProjects: true, canManageTasks: true, canManageRoles: true, canDeleteTasks: true, canDeleteProjects: true }
    : (userRoleObj?.permissions || { canManageTeam: false, canManageProjects: false, canManageTasks: false, canManageRoles: false, canDeleteTasks: false, canDeleteProjects: false });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [notification, setNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null); // Added for Detail Modal
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('general'); // Added for tab remote control
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle

  // Helper for Direct REST Fetch (Bypassing SDK)
  const fetchRest = async (table, queryParams = 'select=*') => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${table}?${queryParams}`;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    let token = key;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) token = session.access_token;
    } catch (e) { /* ignore */ }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`REST Error ${table}: ${response.statusText}`);
    return await response.json();
  };

  // Helper for Direct REST Mutations (Bypassing SDK)
  const mutateRest = async (table, method, body = null, queryParams = '') => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/${table}${queryParams}`;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    let token = key;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) token = session.access_token;
    } catch (e) { /* ignore */ }

    const options = {
      method: method,
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation' // Important to get data back
      }
    };

    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || errData.error_description || `REST ${method} Error: ${response.statusText}`);
    }

    return await response.json();
  };


  // Unified Init Logic (Prevents Flash & Fixes Ghost Sessions)
  const refreshData = async () => {
    setLoading(true);
    const keyName = 'sb-bd-auth-token';

    try {
      // 1. Validate Session with Server (ANTI-GHOST)
      let validToken = null;
      let sessionUser = null;
      const localSession = localStorage.getItem(keyName);

      if (localSession) {
        try {
          const parsed = JSON.parse(localSession);
          if (parsed?.access_token) {
            if (parsed.user.email === 'admin@bd.com') {
              // Admin Backdoor
              validToken = parsed.access_token;
              sessionUser = parsed.user;
            } else {
              // Verify Real User
              const userUrl = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`;
              const res = await fetch(userUrl, {
                headers: {
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${parsed.access_token}`
                }
              });

              if (res.ok) {
                validToken = parsed.access_token;
                sessionUser = parsed.user;
              } else {
                console.warn('Session invalid/expired. Logging out.');
                localStorage.clear();
                sessionUser = null;
              }
            }
          }
        } catch (e) {
          localStorage.clear();
        }
      }

      // 2. Data Fetching
      // 2. Data Fetching
      // Robust Project Fetch with Fallback
      let projectsData = [];
      try {
        projectsData = await fetchRest('projects', 'select=*,resources(*)&order=order_index.asc,id.asc');
      } catch (err) {
        console.warn("Retrying Project Fetch without order_index (Migration likely missing)", err);
        // Fallback: Fetch without custom order
        try {
          projectsData = await fetchRest('projects', 'select=*,resources(*)');
        } catch (err2) {
          console.warn("Fallback (resources) failed too. Fetching basic projects.", err2);
          // Deep Fallback: Basic select
          projectsData = await fetchRest('projects', 'select=*');
        }
      }


      // Robust Task Fetch
      let tasksData = [];
      try {
        tasksData = await fetchRest('tasks', 'select=*&order=order_index.asc,id.asc');
      } catch (err) {
        console.warn("Retrying Task Fetch without order_index", err);
        tasksData = await fetchRest('tasks', 'select=*');
      }

      const [subProjectsData, profilesData, rolesData] = await Promise.all([
        fetchRest('subprojects', 'select=*&order=order_index.asc,id.asc'),
        fetchRest('profiles', 'select=*,roles(name)'),
        fetchRest('roles', 'select=*')
      ]);

      // Process Data
      const formattedProjects = projectsData.map(p => ({
        ...p,
        startDate: p.start_date,
        endDate: p.end_date,
        coverImage: p.cover_image,
        interfaceImage: p.interface_image
      }));
      setProjects(formattedProjects);

      setSubProjects(subProjectsData.map(sp => ({
        ...sp,
        projectId: sp.project_id,
        startDate: sp.start_date,
        endDate: sp.end_date
      })));

      setTasks(tasksData.map(t => ({
        ...t,
        subProjectId: t.subproject_id,
        assignee: t.assignee_id,
        startDate: t.start_date,
        dueDate: t.due_date,
        comments: [],
        history: []
      })));

      setUsers(profilesData.map(u => ({
        ...u,
        role: u.roles?.name || 'Member'
      })));

      if (rolesData.length > 0) setRoles(rolesData);

      // 3. Finalize User State (Load AVATAR from Server Data)
      if (sessionUser) {
        if (sessionUser.email === 'admin@bd.com') {
          setCurrentUser({
            id: 'admin-master',
            email: 'admin@bd.com',
            name: 'Super Admin',
            role: 'Project Manager',
            avatar: null,
            color: 'bg-indigo-600'
          });
        } else {
          const foundProfile = profilesData.find(u => u.id === sessionUser.id);
          if (foundProfile) {
            setCurrentUser({
              ...foundProfile,
              name: foundProfile.name,
              role: foundProfile.roles?.name || 'Member',
              avatar: foundProfile.avatar, // <--- FRESH FROM DB
              email: sessionUser.email
            });
          } else {
            console.warn('User has no profile. Forcing logout.');
            localStorage.clear();
            setCurrentUser(null);
          }
        }
      }

    } catch (error) {
      console.error('Init Error:', error);
      // Don't show toast for init error to avoid spam on recurring failures
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // System Notifications Logic
  useEffect(() => {
    const checkSystemNotifications = () => {
      const newNotifications = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Deadline Checks
      tasks.forEach(task => {
        if (task.status === 'done') return;

        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          newNotifications.push({
            id: `overdue-${task.id}`,
            type: 'alert',
            title: 'Tugas Terlambat',
            message: `Tugas "${task.title}" sudah melewati tenggat waktu (${diffDays * -1} hari).`,
            date: new Date().toISOString(),
            read: false
          });
        } else if (diffDays <= 3 && diffDays >= 0) {
          newNotifications.push({
            id: `upcoming-${task.id}`,
            type: 'warning',
            title: 'Tenggat Waktu Dekat',
            message: `Tugas "${task.title}" harus selesai dalam ${diffDays === 0 ? 'hari ini' : diffDays + ' hari'}.`,
            date: new Date().toISOString(),
            read: false
          });
        }
      });

      // 2. Pending User Checks (Admin Only)
      if (userPermissions.canManageTeam) {
        const pendingCount = users.filter(u => u.status === 'pending').length;
        if (pendingCount > 0) {
          newNotifications.push({
            id: 'pending-users',
            type: 'info', // Can use a new type or 'info'
            title: 'Persetujuan Anggota',
            message: `${pendingCount} anggota baru menunggu persetujuan Anda.`,
            date: new Date().toISOString(),
            read: false
          });
        }
      }

      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
        if (uniqueNew.length === 0) return prev; // No change
        return [...uniqueNew, ...prev];
      });
    };

    if (tasks.length > 0 || users.length > 0) checkSystemNotifications();
  }, [tasks, users, userPermissions]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Auth Handlers
  const handleLogin = async (credentials) => {
    setCurrentUser(credentials);
    showNotification(`Selamat datang, ${credentials.name || credentials.email}!`);
  };

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      // FORCE Manual Logout - No SDK hanging
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const handleMarkAsRead = (id = null) => {
    setNotifications(prev => prev.map(n =>
      (id === null || n.id === id) ? { ...n, read: true } : n
    ));
  };

  let notificationTimeout;
  const showNotification = (msg, type = 'info') => {
    // Clear existing to avoid loops
    if (notificationTimeout) clearTimeout(notificationTimeout);

    setNotification(msg);
    notificationTimeout = setTimeout(() => setNotification(null), 3000);
  };

  // CRUD Handlers - REWRITTEN FOR REST BYPASS
  const handleAddUser = async (userData) => {
    try {
      if (!userData.password) throw new Error('Password wajib diisi untuk user baru via Admin.');

      const foundRole = roles.find(r => r.name === userData.role) || roles.find(r => r.name === 'Member');
      const roleId = foundRole ? foundRole.id : 2;

      // Auto-convert username to email format if needed
      const cleanUsername = (userData.email || '').trim().replace(/\s+/g, '').toLowerCase();
      const finalEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@bd.com`;

      // 1. Sign up the user via standard Supabase Auth
      // This ensures all auth.users and auth.identities records are created properly
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: finalEmail,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            username: cleanUsername
          }
        }
      });

      if (signUpError) throw new Error(`Auth Error: ${signUpError.message}`);
      if (!authData.user) throw new Error('Gagal mendapatkan data user setelah registrasi.');

      const newUserId = authData.user.id;

      // 1.5 Sembunyikan error "Email Not Confirmed" dengan mengonfirmasi secara paksa via RPC
      try {
        await mutateRest('rpc/auto_confirm_user_email', 'POST', { target_user_id: newUserId });
      } catch (err) {
        console.warn('Gagal auto-confirm email, mungkin RPC belum dijalankan', err.message);
      }

      // 2. The trigger `handle_new_user` will auto-create a profile with status 'pending'.
      // Wait a moment for the trigger to finish.
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Automatically approve and set the role for this new user via REST
      const profilePayload = {
        name: userData.name,
        role_id: roleId,
        status: 'active'
      };

      await mutateRest('profiles', 'PATCH', profilePayload, `?id=eq.${newUserId}`);

      const newUserObj = {
        id: newUserId,
        email: userData.email,
        name: userData.name,
        role: foundRole ? foundRole.name : 'Member',
        status: 'active',
        avatar: null,
        color: 'bg-indigo-500'
      };

      // Refresh list
      setUsers([...users, newUserObj]);
      showNotification('Anggota baru berhasil dibuat (Login Aktif)');
    } catch (error) {
      console.error(error);
      showNotification(`Gagal menambah anggota: ${error.message}`, 'error');
    }
  };

  const handleUpdateUser = async (updatedUser) => {
    try {
      const foundRole = roles.find(r => r.name === updatedUser.role);
      const isValidId = foundRole && typeof foundRole.id === 'number';

      // HANDLE PASSWORD UPDATE
      if (updatedUser.password) {
        if (currentUser?.id === updatedUser.id) {
          const { error: pwError } = await supabase.auth.updateUser({ password: updatedUser.password });
          if (pwError) throw new Error(`Gagal update password: ${pwError.message}`);
          showNotification('Password berhasil diperbarui', 'success');
        } else {
          alert('Demi keamanan, pengubahan password pengguna lain hanya boleh dilakukan oleh pengguna itu sendiri. (Atau gunakan fitur Reset Password via Email jika tersedia).');
        }
        // Do not include password in profile payload
      }

      const payload = {
        name: updatedUser.name,
        status: updatedUser.status,
        color: updatedUser.color,
        avatar: updatedUser.avatar // <--- PERSIST AVATAR
      };

      if (isValidId) payload.role_id = foundRole.id;

      await mutateRest('profiles', 'PATCH', payload, `?id=eq.${updatedUser.id}`);
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));

      // IMMEDIATE STATE UPDATE IF SELF
      if (currentUser && currentUser.id === updatedUser.id) {
        setCurrentUser(prev => ({ ...prev, ...updatedUser }));
      }

      showNotification('Profil anggota diperbarui');
    } catch (error) {
      console.error(error);
      showNotification(`Gagal update profil: ${error.message}`, 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (confirm('Hapus anggota ini?')) {
      try {
        await mutateRest('profiles', 'DELETE', null, `?id=eq.${userId}`);
        setUsers(users.filter(u => u.id !== userId));
        showNotification('Anggota dihapus');
      } catch (error) {
        showNotification(`Gagal hapus anggota: ${error.message}`, 'error');
      }
    }
  };

  const handleSaveProject = async (projectData) => {
    if (!userPermissions.canManageProjects) return showNotification('Anda tidak memiliki akses untuk membuat project', 'error');
    try {
      // 1. Create Project
      const pPayload = {
        name: projectData.name,
        description: projectData.description,
        start_date: projectData.startDate,
        end_date: projectData.endDate,
        client: projectData.client,
        budget: projectData.budget,
        cover_image: projectData.coverImage,
        is_private: projectData.isPrivate || false,
        assignees: projectData.assignees || []
      };

      const projectResult = await mutateRest('projects', 'POST', pPayload);
      const project = projectResult[0];

      // 2. Create Default Subproject
      const sPayload = {
        project_id: project.id,
        name: 'General',
        start_date: project.start_date,
        end_date: project.end_date
      };

      const subResult = await mutateRest('subprojects', 'POST', sPayload);
      const subProject = subResult[0];

      // Update Local State
      const newProject = {
        ...project,
        startDate: project.start_date,
        endDate: project.end_date,
        coverImage: project.cover_image,
        resources: []
      };
      const newSub = {
        ...subProject,
        projectId: subProject.project_id,
        startDate: subProject.start_date,
        endDate: subProject.end_date
      };

      setProjects([...projects, newProject]);
      setSubProjects([...subProjects, newSub]);
      setIsProjectModalOpen(false);
      setSelectedProjectId(project.id);
      showNotification('Project baru berhasil dibuat');

    } catch (error) {
      console.error(error);
      showNotification(`Gagal membuat project: ${error.message}`, 'error');
    }
  };

  const handleAddSubProject = async (subProjectData) => {
    if (!userPermissions.canManageProjects) return showNotification('Anda tidak memiliki akses untuk menambah sub-project', 'error');
    try {
      const payload = {
        project_id: subProjectData.projectId,
        name: subProjectData.name,
        start_date: subProjectData.startDate,
        end_date: subProjectData.endDate
      };

      const result = await mutateRest('subprojects', 'POST', payload);
      const data = result[0];

      setSubProjects([...subProjects, {
        ...data,
        projectId: data.project_id,
        startDate: data.start_date,
        endDate: data.end_date
      }]);
      showNotification('Sub-Project berhasil ditambahkan');
    } catch (error) {
      console.error(error);
      showNotification(`Gagal menambah sub-project: ${error.message}`, 'error');
    }
  };

  const handleUpdateProject = async (updatedProject) => {
    if (!userPermissions.canManageProjects) return showNotification('Anda tidak memiliki akses untuk edit project', 'error');

    const originalProject = projects.find(p => p.id === updatedProject.id);
    if (!originalProject) return;

    try {
      // 1. Update Project Details
      const projectPayload = {
        name: updatedProject.name,
        description: updatedProject.description,
        start_date: updatedProject.startDate,
        end_date: updatedProject.endDate,
        client: updatedProject.client,
        budget: updatedProject.budget,
        cover_image: updatedProject.coverImage,
        interface_image: updatedProject.interfaceImage
      };

      await mutateRest('projects', 'PATCH', projectPayload, `?id=eq.${updatedProject.id}`);

      // 2. Handle Resources Sync
      const newResourcesList = updatedProject.resources || [];
      const oldResourcesList = originalProject.resources || [];

      const createdResources = [];
      const finalResources = []; // To rebuild local state

      // A. Identify Changes
      const toCreate = newResourcesList.filter(r => typeof r.id === 'string' && r.id.startsWith('r'));
      const toUpdate = newResourcesList.filter(r => !((typeof r.id === 'string') && r.id.startsWith('r')));
      const toDelete = oldResourcesList.filter(old => !toUpdate.find(curr => curr.id === old.id));

      // B. Execute Deletes
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(r => mutateRest('resources', 'DELETE', null, `?id=eq.${r.id}`)));
      }

      // C. Execute Updates
      if (toUpdate.length > 0) {
        await Promise.all(toUpdate.map(r => {
          const payload = {
            name: r.name,
            type: r.type,
            url: r.url,
            description: r.description
          };
          return mutateRest('resources', 'PATCH', payload, `?id=eq.${r.id}`);
        }));
        finalResources.push(...toUpdate);
      }

      // D. Execute Creates
      if (toCreate.length > 0) {
        await Promise.all(toCreate.map(async r => {
          const payload = {
            project_id: updatedProject.id,
            name: r.name,
            type: r.type,
            url: r.url,
            description: r.description
          };
          const res = await mutateRest('resources', 'POST', payload);
          createdResources.push(res[0]);
        }));
        finalResources.push(...createdResources);
      }

      // 3. Update Local State
      const finalProject = {
        ...updatedProject,
        resources: finalResources
      };

      setProjects(projects.map(p => p.id === updatedProject.id ? finalProject : p));
      showNotification('Informasi project dan resources diperbarui');
    } catch (error) {
      console.error(error);
      showNotification(`Gagal update project: ${error.message}`, 'error');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!userPermissions.canDeleteProjects) return showNotification('Anda tidak memiliki akses untuk menghapus project', 'error');

    const projectToDelete = projects.find(p => p.id === projectId);
    if (!projectToDelete) return;

    if (confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus project "${projectToDelete.name}"?`)) {
      try {
        await mutateRest('projects', 'DELETE', null, `?id=eq.${projectId}`);

        setProjects(projects.filter(p => p.id !== projectId));
        setSubProjects(subProjects.filter(sp => sp.projectId !== projectId));
        setTasks(tasks.filter(t => {
          const spIds = subProjects.filter(sp => sp.projectId === projectId).map(sp => sp.id);
          return !spIds.includes(t.subProjectId);
        }));

        setSelectedProjectId('all');
        showNotification('Project berhasil dihapus');
      } catch (error) {
        console.error(error);
        showNotification(`Gagal hapus project: ${error.message}`, 'error');
      }
    }
  };

  const handleSaveTask = async (taskData) => {
    if (!userPermissions.canManageTasks) return showNotification('Anda tidak memiliki akses untuk membuat/edit tugas', 'error');

    const { projectId, ...finalData } = taskData;

    try {
      const payload = {
        title: finalData.title,
        status: finalData.status || 'todo',
        priority: finalData.priority || 'medium',
        assignee_id: finalData.assignee || null,
        start_date: finalData.startDate,
        due_date: finalData.dueDate,
        subproject_id: finalData.subProjectId
      };

      if (editingTask) {
        // UPDATE
        const result = await mutateRest('tasks', 'PATCH', payload, `?id=eq.${editingTask.id}`);
        // const data = result[0]; // If using 'prefer: return=representation'

        const updatedTask = {
          ...finalData,
          id: editingTask.id,
          history: editingTask.history // Keep history
        };
        setTasks(tasks.map(t => t.id === editingTask.id ? updatedTask : t));
        showNotification('Tugas berhasil diperbarui');

      } else {
        // INSERT
        const result = await mutateRest('tasks', 'POST', payload);
        const data = result[0];

        const newTask = {
          ...data,
          subProjectId: data.subproject_id,
          assignee: data.assignee_id,
          startDate: data.start_date,
          dueDate: data.due_date,
          comments: [],
          history: []
        };
        setTasks([...tasks, newTask]);

        setNotifications(prev => [{
          id: `new-${Date.now()}`,
          type: 'info',
          title: 'Tugas Baru',
          message: `Tugas "${newTask.title}" dibuat.`,
          date: new Date().toISOString(),
          read: false
        }, ...prev]);

        showNotification('Tugas baru ditambahkan');
      }
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error(error);
      showNotification(`Gagal menyimpan tugas: ${error.message}`, 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!userPermissions.canDeleteTasks) return showNotification('Anda tidak memiliki akses untuk menghapus tugas', 'error');

    if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
      try {
        await mutateRest('tasks', 'DELETE', null, `?id=eq.${taskId}`);
        setTasks(tasks.filter(t => t.id !== taskId));
        showNotification('Tugas dihapus');
      } catch (error) {
        console.error(error);
        showNotification(`Gagal menghapus tugas: ${error.message}`, 'error');
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    // Optimistic Update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await mutateRest('tasks', 'PATCH', { status: newStatus }, `?id=eq.${taskId}`);
    } catch (error) {
      console.error(error);
      showNotification(`Gagal update status: ${error.message}`, 'error');
    }
  };

  // Comments (Placeholder as table not fully impld in SQL yet, but assuming tasks table has jsonb or separate table)
  // For now local state only to avoid breaking UI if backend table missing
  const handleAddComment = (taskId, comment) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, comments: [comment, ...(t.comments || [])] };
      }
      return t;
    }));
  };

  const openAddModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const getFilteredTasks = () => {
    if (selectedProjectId === 'all') return tasks;
    const projectSubIds = subProjects
      .filter(sp => sp.projectId === selectedProjectId)
      .map(sp => sp.id);
    return tasks.filter(t => projectSubIds.includes(t.subProjectId));
  };

  const handleDeleteSubProject = async (subProjectId) => {
    if (!userPermissions.canManageProjects) return showNotification('Anda tidak memiliki akses untuk menyunting sub-project', 'error');
    if (confirm('Yakin hapus sub-project ini?')) {
      try {
        await mutateRest('subprojects', 'DELETE', null, `?id=eq.${subProjectId}`);
        setSubProjects(subProjects.filter(sp => sp.id !== subProjectId));
        showNotification('Sub Project berhasil dihapus', 'success');
      } catch (error) {
        showNotification(`Gagal hapus sub-project: ${error.message}`, 'error');
      }
    }
  };

  const handleUpdateRoles = async (newRoles) => {
    try {
      // Need to handle bulk updates carefully with REST
      // We'll iterate and await (slow but safe)
      for (const role of newRoles) {
        const payload = {
          name: role.name,
          color: role.color,
          permissions: role.permissions
        };

        if (typeof role.id === 'number') {
          // Update
          await mutateRest('roles', 'PATCH', payload, `?id=eq.${role.id}`);
        } else {
          // Insert
          await mutateRest('roles', 'POST', payload);
        }
      }

      // Refetch roles to sync IDs
      const rolesData = await fetchRest('roles');
      setRoles(rolesData);

      showNotification('Konfigurasi Role disimpan');

    } catch (error) {
      console.error(error);
      showNotification(`Gagal menyimpan role: ${error.message}`, 'error');
    }
  };

  const handleUpdateSubProject = async (updatedSubProject) => {
    if (!userPermissions.canManageProjects) return showNotification('Anda tidak memiliki akses untuk update sub-project', 'error');
    try {
      const payload = {
        name: updatedSubProject.name,
        start_date: updatedSubProject.startDate,
        end_date: updatedSubProject.endDate,
        order_index: updatedSubProject.order_index
      };

      await mutateRest('subprojects', 'PATCH', payload, `?id=eq.${updatedSubProject.id}`);
      setSubProjects(prev => prev.map(sp => sp.id === updatedSubProject.id ? updatedSubProject : sp));
      showNotification('Sub Project berhasil diperbarui', 'success');
    } catch (error) {
      showNotification(`Gagal update sub-project: ${error.message}`, 'error');
    }
  };

  const handleUpdateProjectOrder = async (newOrder) => {
    if (!newOrder || newOrder.length === 0) return;

    // 1. Optimistic Update Local State
    setProjects(newOrder);

    // 2. Persist to Backend (Debounced/Batch)
    try {
      await Promise.all(newOrder.map((p, index) =>
        mutateRest('projects', 'PATCH', { order_index: index }, `?id=eq.${p.id}`)
      ));
    } catch (error) {
      console.error("Failed to update project order", error);
      // We could revert here, but simplicity first
    }
  };

  const handleUpdateTaskOrder = async (newOrderedTasks) => {
    // 1. Optimistic
    setTasks(prev => {
      // We only have the reordered subset. We need to merge it back into the main list.
      // Actually, simpler: create a map of id -> newIndex/Order?
      // Or just update the specific tasks in the main list.
      const updatedIds = new Set(newOrderedTasks.map(t => t.id));
      const otherTasks = prev.filter(t => !updatedIds.has(t.id));
      return [...otherTasks, ...newOrderedTasks].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      // Wait, local 'newOrderedTasks' already has new order_index applied by ListView? 
      // No, ListView usually sends the array in order. We need to assign indices.
    });

    // Actually, let's just accept that ListView sends 'newOrderedTasks' which is the array of tasks in the new order.
    // We need to assign 'order_index' to them based on their position in this array.
    // And then merge with existing tasks.

    // BUT, be careful. If we reorder tasks in "Project A", we don't want to mess up tasks in "Project B".
    // The 'newOrderedTasks' should only contain the tasks that were reordered (e.g. from Project A).

    // Let's assume 'newOrderedTasks' is the complete list of tasks for the specific projectgroup that was reordered.

    const updates = newOrderedTasks.map((t, index) => ({
      ...t,
      order_index: index
    }));

    // Update State
    setTasks(prev => {
      const updateMap = new Map(updates.map(t => [t.id, t]));
      return prev.map(t => updateMap.get(t.id) || t);
    });

    // Persist
    try {
      await Promise.all(updates.map(t =>
        mutateRest('tasks', 'PATCH', { order_index: t.order_index }, `?id=eq.${t.id}`)
      ));
    } catch (e) {
      console.error("Failed to persist task order", e);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">Memuat Data...</div>;
  }

  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-white transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-slate-100/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 backdrop-blur-xl p-4 flex flex-col z-40 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex flex-col items-center gap-3 px-2 mb-8 mt-2 text-center">
          <img src={logoBd} alt="BD Project Management" className="w-full max-w-[180px] object-contain" />
          <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 uppercase">
            BD Project Management
          </span>
        </div>

        {/* Project Selector */}
        <div className="mb-6 px-2">
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-2">
              {selectedProjectId !== 'all' && userPermissions.canDeleteProjects && (
                <button
                  onClick={() => handleDeleteProject(selectedProjectId)}
                  className="text-slate-400 hover:text-red-600 transition"
                  title="Hapus Project Ini"
                >
                  <Trash2 size={16} />
                </button>
              )}
              {userPermissions.canManageProjects && (
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition"
                  title="Tambah Project Baru"
                >
                  <PlusCircle size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <select
              className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white py-2 pl-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="all">Semua Proyek</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" activeView={activeView} setActiveView={setActiveView} onNavigate={() => setSidebarOpen(false)} />
          <NavItem id="overview" icon={Info} label="Overview & Info" activeView={activeView} setActiveView={setActiveView} onNavigate={() => setSidebarOpen(false)} />
          <NavItem id="timeline" icon={BarChart3} label="Timeline & Jadwal" activeView={activeView} setActiveView={setActiveView} onNavigate={() => setSidebarOpen(false)} />
          <NavItem id="calendar" icon={CalendarDays} label="Kalender" activeView={activeView} setActiveView={setActiveView} onNavigate={() => setSidebarOpen(false)} />
          <NavItem id="kanban" icon={KanbanSquare} label="Kanban Board" activeView={activeView} setActiveView={setActiveView} onNavigate={() => setSidebarOpen(false)} />
          <NavItem id="list" icon={ListTodo} label="Daftar Tugas" activeView={activeView} setActiveView={setActiveView} onNavigate={() => setSidebarOpen(false)} />
          <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
            <NavItem id="team" icon={Users} label="Tim & Anggota" activeView={activeView} setActiveView={setActiveView} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <div className="relative">
              <div className={`w-10 h-10 rounded-full ${currentUser?.color || 'bg-indigo-500'} flex items-center justify-center text-white font-bold`}>
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                ) : (
                  <span>{currentUser?.name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-100 dark:border-slate-900 rounded-full"></div>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{currentUser?.name || 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{currentUser?.role || 'Member'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-auto p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              title="Keluar"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 h-screen flex flex-col overflow-hidden">
        {/* Header */}
        {/* Header */}
        <header className="h-16 px-4 md:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-[20] flex items-center justify-between">
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <Menu size={22} />
            </button>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">BD PM</span>
          </div>

          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
              {activeView === 'kanban' ? 'Papan Kanban' :
                activeView === 'timeline' ? 'Timeline & Jadwal' :
                  activeView === 'overview' ? 'Project Overview' :
                    activeView === 'calendar' ? 'Kalender Bulanan' : activeView}
            </h1>
            <p className="text-xs text-slate-500">
              Selamat datang kembali, {currentUser?.name}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition relative"
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  {/* Backdrop for click-outside */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <NotificationDropdown
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                    notifications={notifications}
                    setNotifications={setNotifications}
                    onMarkAsRead={handleMarkAsRead}
                    onSelect={(notif) => {
                      setSelectedNotification(notif);
                      handleMarkAsRead(notif.id);
                      setShowNotifications(false);
                    }}
                  />
                </>
              )}
            </div>
            {userPermissions.canManageRoles && (
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <Settings size={20} />
              </button>
            )}
          </div>
        </header>

        {/* Dynamic View Content */}
        <div className={`flex-1 p-4 md:p-8 pb-24 md:pb-8 ${activeView === 'timeline' || activeView === 'kanban' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {activeView === 'dashboard' && (
            <DashboardView
              projects={projects}
              tasks={tasks}
              users={users}
              currentUser={currentUser}
            />
          )}

          {activeView === 'overview' && (
            <OverviewView
              projects={projects}
              subProjects={subProjects}
              tasks={tasks}
              users={users}
              selectedProjectId={selectedProjectId}
              activeView={activeView}
              setActiveView={setActiveView}
              onSelectProject={setSelectedProjectId}
              project={projects.find(p => p.id === selectedProjectId)}
              onUpdateProject={handleUpdateProject}
              onAddSubProject={handleAddSubProject}
              onUpdateSubProject={handleUpdateSubProject}
              onDeleteSubProject={handleDeleteSubProject}
              currentUser={currentUser}
              userPermissions={userPermissions}
            />
          )}

          {activeView === 'timeline' && (
            <TimelineView
              projects={projects}
              subProjects={subProjects}
              tasks={getFilteredTasks()}
              users={users}
              selectedProjectId={selectedProjectId}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarView
              tasks={getFilteredTasks()}
              projects={projects}
              onTaskClick={openEditModal}
            />
          )}

          {activeView === 'kanban' && (
            <div className="h-[calc(100vh-10rem)] overflow-hidden">
              <KanbanView
                tasks={getFilteredTasks()}
                onStatusChange={handleStatusChange}
                onEditTask={openEditModal}
                users={users}
                subProjects={subProjects}
                projects={projects}
                selectedProjectId={selectedProjectId}
                currentUser={currentUser}
                userPermissions={userPermissions}
              />
            </div>
          )}

          {activeView === 'list' && (
            <ListView
              tasks={getFilteredTasks()}
              onStatusChange={handleStatusChange}
              onEditTask={openEditModal}
              onDeleteTask={handleDeleteTask}
              users={users}
              subProjects={subProjects}
              projects={selectedProjectId === 'all' ? projects : projects.filter(p => p.id === selectedProjectId)}
              statuses={STATUS_CONFIG}
              priorities={PRIORITY_CONFIG}
              onUpdateProjectOrder={handleUpdateProjectOrder}
              onUpdateTaskOrder={handleUpdateTaskOrder}
              currentUser={currentUser}
              userPermissions={userPermissions}
            />
          )}

          {activeView === 'team' && (
            <TeamView
              users={users}
              roles={roles}
              onAddUser={handleAddUser}
              onManageRoles={() => { setSettingsInitialTab('roles'); setIsSettingsModalOpen(true); }}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              currentUser={currentUser}
              onUpdateRoles={handleUpdateRoles}
              onRefresh={refreshData}
            />
          )}
        </div>
      </main>

      {/* Floating Action Button for Tasks */}
      {userPermissions.canManageTasks && (
        <button
          onClick={openAddModal}
          className="fixed bottom-24 md:bottom-8 right-6 md:right-8 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center transition hover:scale-110 z-30"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 flex items-center justify-around px-2 py-2 safe-area-pb">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'kanban', icon: KanbanSquare, label: 'Kanban' },
          { id: 'list', icon: ListTodo, label: 'Tugas' },
          { id: 'team', icon: Users, label: 'Tim' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors min-w-[60px] ${
              activeView === item.id
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        users={users}
      />

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
        users={users}
        projects={projects}
        subProjects={subProjects}
        initialProjectId={selectedProjectId !== 'all' ? selectedProjectId : null}
      />

      {/* Notification Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedNotification(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <div className={`h-2 w-full ${selectedNotification.type === 'alert' ? 'bg-red-500' :
              selectedNotification.type === 'warning' ? 'bg-amber-500' : 'bg-indigo-500'
              }`} />

            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 mb-2
                            ${selectedNotification.type === 'alert' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                    selectedNotification.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}
                >
                  {selectedNotification.type === 'alert' ? <AlertCircle size={24} /> :
                    selectedNotification.type === 'warning' ? <Clock size={24} /> :
                      <MessageSquare size={24} />}
                </div>
                <button onClick={() => setSelectedNotification(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{selectedNotification.title}</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {selectedNotification.message}
              </p>

              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-4">
                <Calendar size={16} />
                <span>{new Date(selectedNotification.date).toLocaleString()}</span>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg font-medium transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        roles={roles}
        onUpdateRoles={handleUpdateRoles}
        users={users}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        initialTab={settingsInitialTab}
      />

      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl z-50 animate-fade-in-up flex items-center gap-3
          ${notification.includes('Gagal') || notification.includes('Error')
            ? 'bg-red-500 text-white'
            : 'bg-slate-800 text-white'
          }`}
        >
          <span className="text-sm">{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-full hover:bg-white/20 transition"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
