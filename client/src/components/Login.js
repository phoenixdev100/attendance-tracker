import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from './Alert';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState(null);
    const navigate = useNavigate();

    const showAlert = (message, type) => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 5000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            showAlert('Please enter both username and password', 'warning');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store user info in localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);

                // Call parent onLogin callback
                onLogin(data.user);

                // Navigate based on role
                if (data.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/');
                }

                showAlert('Login successful!', 'success');
            } else {
                showAlert(data.message || 'Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Network error. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="card">
                <div className="header">
                    <div className="title-section">
                        <h1 className="main-title">🔐 Login</h1>
                        <p className="subtitle">Attendance Tracker</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">
                            Username:
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            className="form-input"
                            disabled={loading}
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            Password:
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="form-input"
                            disabled={loading}
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-present"
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Logging in...' : '🔓 Login'}
                    </button>
                </form>

                {alert && (
                    <Alert
                        message={alert.message}
                        type={alert.type}
                        onClose={() => setAlert(null)}
                    />
                )}

                <div className="login-info" style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 10px 0', fontWeight: '600', color: '#333' }}>Demo Credentials:</p>
                    <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#666' }}>
                        <strong>Admin:</strong> admin / admin123
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#666' }}>
                        <strong>User:</strong> user / user123
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
