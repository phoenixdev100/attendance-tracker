import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import { useToast } from '../hooks/useToast';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [currentUser, setCurrentUser] = useState(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'user',
        name: ''
    });

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/users');
            setUsers(response.data.users);
            setHasLoaded(true);
        } catch (error) {
            console.error('Error loading users:', error);
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

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

        // Validation
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
                    delete updateData.password; // Don't send empty password
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
        return new Date(dateString).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    };

    return (
        <div className="user-management">
            <div className="user-management-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Link to="/admin" className="btn btn-secondary">
                        ← Back to Dashboard
                    </Link>
                    <h2>👥 User Management</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {hasLoaded && (
                        <button onClick={loadUsers} className="btn btn-secondary" disabled={loading}>
                            {loading ? 'Loading...' : '🔄 Refresh'}
                        </button>
                    )}
                    <button onClick={openCreateModal} className="btn btn-present">
                        ➕ Create New User
                    </button>
                </div>
            </div>

            {!hasLoaded ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <h3 style={{ color: '#666', marginBottom: '20px' }}>Click below to load users</h3>
                    <button onClick={loadUsers} className="btn btn-present" disabled={loading} style={{ minWidth: '200px' }}>
                        {loading ? 'Loading...' : '👥 Load Users'}
                    </button>
                </div>
            ) : (
                <div className="users-table-container">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Created</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td>{user.username}</td>
                                        <td>{user.name}</td>
                                        <td>
                                            <span className={`role-badge ${user.role}`}>
                                                {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                                            </span>
                                        </td>
                                        <td>{formatDate(user.created_at)}</td>
                                        <td>{formatDate(user.last_login)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="btn-action btn-edit"
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="btn-action btn-delete"
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal for Create/Edit */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{modalMode === 'create' ? '➕ Create New User' : '✏️ Edit User'}</h3>
                            <button onClick={closeModal} className="modal-close">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="user-form">
                            <div className="form-group">
                                <label htmlFor="username" className="form-label">
                                    Username: <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter username"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="name" className="form-label">
                                    Full Name: <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="role" className="form-label">
                                    Role: <span className="required">*</span>
                                </label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    required
                                >
                                    <option value="user">👤 User</option>
                                    <option value="admin">👑 Admin</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="password" className="form-label">
                                    Password: {modalMode === 'create' && <span className="required">*</span>}
                                    {modalMode === 'edit' && <span className="hint">(leave blank to keep current)</span>}
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder={modalMode === 'create' ? 'Enter password (min 6 chars)' : 'Enter new password (optional)'}
                                    required={modalMode === 'create'}
                                    minLength={formData.password ? 6 : 0}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={closeModal} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-present">
                                    {modalMode === 'create' ? '➕ Create User' : '💾 Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
