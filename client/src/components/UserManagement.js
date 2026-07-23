import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Crown,
  User,
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import api from '../config/api';
import { useToast } from '../hooks/useToast';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'user',
        name: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const navigate = useNavigate();

    const loadUsers = useCallback(async () => {
        try {
            const response = await api.get('/api/users');
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error loading users:', error);
            showToast('Failed to load users', 'error');
        }
    }, [showToast]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    useEffect(() => {
        let filtered = users;

        if (searchTerm) {
            filtered = filtered.filter(user =>
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.username.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (roleFilter !== 'all') {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        setFilteredUsers(filtered);
    }, [users, searchTerm, roleFilter]);

    const openCreateModal = () => {
        setModalMode('create');
        setFormData({ username: '', password: '', role: 'user', name: '' });
        setCurrentUser(null);
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setModalMode('edit');
        setFormData({
            username: user.username,
            password: '',
            role: user.role,
            name: user.name
        });
        setCurrentUser(user);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData({ username: '', password: '', role: 'user', name: '' });
        setCurrentUser(null);
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.name) {
            showToast('Username and name are required', 'warning');
            return;
        }

        if (modalMode === 'create' && !formData.password) {
            showToast('Password is required for new users', 'warning');
            return;
        }

        if (formData.password && formData.password.length < 6) {
            showToast('Password must be at least 6 characters', 'warning');
            return;
        }

        try {
            if (modalMode === 'create') {
                await api.post('/api/users', formData);
                showToast('User created successfully!', 'success');
            } else {
                const updateData = { ...formData };
                if (!updateData.password) {
                    delete updateData.password;
                }
                await api.put(`/api/users/${currentUser.id}`, updateData);
                showToast('User updated successfully!', 'success');
            }

            closeModal();
            loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            const message = error.response?.data?.message || 'Failed to save user';
            showToast(message, 'error');
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
            return;
        }

        try {
            await api.delete(`/api/users/${user.id}`);
            showToast('User deleted successfully!', 'success');
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            const message = error.response?.data?.message || 'Failed to delete user';
            showToast(message, 'error');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-IN', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.last_login).length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const regularUsers = users.filter(u => u.role === 'user').length;

    return (
        <div className="h-screen p-3 sm:p-4 lg:p-6">
            <div className="bg-white rounded-2xl sm:rounded-[30px] shadow-xl border border-slate-200 p-4 sm:p-6 lg:p-8 w-full h-full flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-3 shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <button 
                            onClick={() => navigate('/admin')}
                            className="border border-blue-600 text-blue-600 px-2 sm:px-3 py-2 rounded-lg flex items-center gap-1 sm:gap-2 hover:bg-blue-600 hover:text-white transition text-xs sm:text-sm"
                        >
                            <ArrowLeft size={14} />
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Users className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-2xl font-bold text-slate-800">User Management</h1>
                            <p className="text-slate-500 text-xs sm:text-sm hidden sm:block">Manage users, roles and permissions</p>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                            onClick={openCreateModal}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-1 sm:gap-2 shadow-lg text-xs sm:text-sm w-full sm:w-auto justify-center"
                        >
                            <Plus size={14} />
                            Add User
                        </button>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4 shrink-0">
                    <StatCard
                        title="Total Users"
                        value={String(totalUsers)}
                        icon={<Users size={18} />}
                        color="blue"
                    />
                    <StatCard
                        title="Active"
                        value={String(activeUsers)}
                        icon={<UserCheck size={18} />}
                        color="green"
                    />
                    <StatCard
                        title="Admins"
                        value={String(adminUsers)}
                        icon={<Crown size={18} />}
                        color="yellow"
                    />
                    <StatCard
                        title="Regular"
                        value={String(regularUsers)}
                        icon={<User size={18} />}
                        color="pink"
                    />
                </div>

                {/* Search */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-3 sm:mt-4 shrink-0">
                    <div className="flex-1 flex items-center border rounded-lg px-3">
                        <Search className="text-slate-400" size={16} />
                        <input
                            className="w-full py-2 outline-none ml-2 text-sm"
                            placeholder="Search user..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="w-full sm:w-auto border border-slate-300 px-4 py-2 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white cursor-pointer hover:border-blue-400 transition pr-10 flex items-center justify-between min-w-[120px]"
                        >
                            {roleFilter === 'all' ? 'All Roles' : roleFilter === 'admin' ? 'Admin' : 'User'}
                            <ChevronDown className="text-slate-400" size={16} />
                        </button>
                        {dropdownOpen && (
                            <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[120px] overflow-hidden">
                                <button
                                    onClick={() => { setRoleFilter('all'); setDropdownOpen(false); }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition first:rounded-t-lg last:rounded-b-lg"
                                >
                                    All Roles
                                </button>
                                <button
                                    onClick={() => { setRoleFilter('admin'); setDropdownOpen(false); }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition last:rounded-b-lg"
                                >
                                    Admin
                                </button>
                                <button
                                    onClick={() => { setRoleFilter('user'); setDropdownOpen(false); }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition last:rounded-b-lg"
                                >
                                    User
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border mt-3 sm:mt-4 flex-1 overflow-auto">
                    <div className="min-w-[640px]">
                        <table className="w-full">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr className="text-left">
                                    <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold">User</th>
                                    <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold">Role</th>
                                    <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold">Status</th>
                                    <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold">Created</th>
                                    <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold">Last Login</th>
                                    <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-6 sm:py-8 text-gray-500 text-sm">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-t hover:bg-blue-50 transition"
                                        >
                                            <td className="px-2 sm:px-4 py-2">
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                                                        alt=""
                                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                                                    />
                                                    <div>
                                                        <h3 className="font-semibold text-xs sm:text-sm">{user.name}</h3>
                                                        <p className="text-slate-500 text-xs">{user.username}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-4 py-2">
                                                {user.role === 'admin' ? (
                                                    <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 border text-xs whitespace-nowrap">
                                                        👑 Admin
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 border text-xs whitespace-nowrap">
                                                        User
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2 sm:px-4 py-2">
                                                {user.last_login ? (
                                                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs whitespace-nowrap">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs whitespace-nowrap">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">{formatDate(user.created_at)}</td>
                                            <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">{formatDate(user.last_login)}</td>
                                            <td className="px-2 sm:px-4 py-2">
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => openEditModal(user)}
                                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded border hover:bg-blue-600 hover:text-white transition"
                                                    >
                                                        <Pencil size={14} className="mx-auto" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(user)}
                                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded border hover:bg-red-500 hover:text-white transition"
                                                    >
                                                        <Trash2 size={14} className="mx-auto" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal for Create/Edit */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">
                                {modalMode === 'create' ? 'Create New User' : 'Edit User'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label htmlFor="username" className="block text-xs font-medium mb-1">
                                    Username <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                    placeholder="Enter username"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="name" className="block text-xs font-medium mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="role" className="block text-xs font-medium mb-1">
                                    Role <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 text-sm appearance-none pr-10"
                                        required
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-xs font-medium mb-1">
                                    Password {modalMode === 'create' && <span className="text-red-500">*</span>}
                                    {modalMode === 'edit' && <span className="text-gray-500 text-xs">(leave blank to keep current)</span>}
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                    placeholder={modalMode === 'create' ? 'Enter password (min 6 chars)' : 'Enter new password (optional)'}
                                    required={modalMode === 'create'}
                                    minLength={formData.password ? 6 : 0}
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={closeModal}
                                    className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                                >
                                    {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

function StatCard({ title, value, icon, color }) {
    const bg = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        yellow: "bg-yellow-50 text-yellow-600",
        pink: "bg-pink-50 text-pink-600",
    };

    return (
        <div className="border rounded-xl p-3 hover:shadow-lg transition">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg[color]}`}>
                {icon}
            </div>
            <h2 className="mt-2 text-xl font-bold">{value}</h2>
            <p className="text-slate-500 text-xs">{title}</p>
        </div>
    );
}

export default UserManagement;
