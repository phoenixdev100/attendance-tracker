import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/api';
import Alert from './Alert';

const AdminDashboard = ({ user, onLogout }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [showStats, setShowStats] = useState(true); // Control visibility of stats
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
    const navigate = useNavigate();

    const formatDate = (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/api/today-stats');
            setStats(response.data);
            setLastUpdated(new Date().toLocaleTimeString());
            setHasLoaded(true);
            setShowStats(true); // Show stats when loaded

        } catch (error) {
            console.error('Error loading stats:', error);
            setError('Failed to load statistics. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Check if user is admin
        if (!user || user.role !== 'admin') {
            navigate('/login');
            return;
        }

        // Don't auto-load stats anymore
        // Only setup auto-refresh if enabled and stats are loaded
        let interval;
        if (autoRefreshEnabled && hasLoaded) {
            interval = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    loadStats();
                }
            }, 30000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [user, navigate, autoRefreshEnabled, hasLoaded]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        onLogout();
        navigate('/login');
    };

    const handleDownloadExcel = async () => {
        setDownloading(true);

        try {
            const response = await api.get('/api/export-excel', {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const today = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `attendance_records_${today}.xlsx`);

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error downloading Excel file:', error);
            alert('Error downloading file. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const handleMarkAbsent = async (systemId, studentName) => {
        if (!window.confirm(`Are you sure you want to mark ${studentName} (${systemId}) as absent?`)) {
            return;
        }

        try {
            const response = await api.post('/api/mark-absent', { systemId });

            if (response.data.success) {
                loadStats();
                alert(`${studentName} has been marked as absent successfully.`);
            }
        } catch (error) {
            console.error('Error marking student absent:', error);

            if (error.response && error.response.data) {
                alert(`Error: ${error.response.data.message}`);
            } else {
                alert('Network error. Please try again.');
            }
        }
    };

    const rate = stats && stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

    return (
        <div className="container">
            <div className="card" style={{ maxWidth: '900px' }}>
                <div className="header">
                    <div className="title-section">
                        <h1 className="main-title">👨‍💼 Admin Dashboard</h1>
                        <p className="subtitle">Welcome, {user?.username}</p>
                    </div>
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        onClose={() => setError(null)}
                    />
                )}

                {!hasLoaded ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <h3 style={{ color: '#666', marginBottom: '20px' }}>Click below to load today's attendance statistics</h3>
                        <button onClick={loadStats} className="btn btn-present" disabled={loading} style={{ minWidth: '250px' }}>
                            {loading ? 'Loading...' : '📊 Load Attendance Stats'}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Show/Hide button when stats are loaded */}
                        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                            <button
                                onClick={() => setShowStats(!showStats)}
                                className="btn btn-secondary"
                                style={{ minWidth: '200px' }}
                            >
                                {showStats ? '👁️ Hide Statistics' : '👁️ Show Statistics'}
                            </button>
                        </div>

                        {showStats && stats && (
                            <>
                                <div className="date-display">
                                    <strong>Date:</strong> {formatDate(stats.date)}
                                </div>

                                <div className="stats-grid">
                                    <div className="stat-card total">
                                        <div className="stat-number">{stats.total}</div>
                                        <div className="stat-label">Total Students</div>
                                    </div>

                                    <div className="stat-card present">
                                        <div className="stat-number">{stats.present}</div>
                                        <div className="stat-label">Present</div>
                                    </div>

                                    <div className="stat-card absent">
                                        <div className="stat-number">{stats.absent}</div>
                                        <div className="stat-label">Absent</div>
                                    </div>
                                </div>

                                <div className="attendance-rate">
                                    <div className="rate-label">Attendance Rate</div>
                                    <div className="rate-bar">
                                        <div
                                            className="rate-fill"
                                            style={{ width: `${rate}%` }}
                                        >
                                            <div className="rate-text">{rate}%</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Present Students List */}
                                {stats.presentStudents && stats.presentStudents.length > 0 && (
                                    <div className="present-students-section">
                                        <h3 className="section-title">📋 Present Students Today</h3>
                                        <div className="students-list">
                                            {stats.presentStudents.map((student) => (
                                                <div key={student.system_id} className="student-card">
                                                    <div className="student-info-row">
                                                        <div className="student-details">
                                                            <div className="student-name">{student.name}</div>
                                                            <div className="student-id">ID: {student.system_id}</div>
                                                            {student.marked_by_name && (
                                                                <div className="marked-by" style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                                                                    👤 Marked by: {student.marked_by_name}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="student-status">
                                                            <span className="status-badge present">✓ Present</span>
                                                            <div className="recorded-time">
                                                                {new Date(student.recorded_at).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                    hour12: true
                                                                })}
                                                            </div>
                                                            <button
                                                                className="btn-absent-small"
                                                                onClick={() => handleMarkAbsent(student.system_id, student.name)}
                                                                title="Mark as Absent"
                                                            >
                                                                ❌
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {lastUpdated && (
                                    <div className="last-updated">
                                        Last updated: {lastUpdated}
                                    </div>
                                )}

                                {/* Auto-refresh toggle */}
                                <div style={{ marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        id="autoRefresh"
                                        checked={autoRefreshEnabled}
                                        onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="autoRefresh" style={{ cursor: 'pointer', margin: 0, color: '#666' }}>
                                        🔄 Auto-refresh every 30 seconds
                                    </label>
                                </div>
                            </>
                        )}
                    </>
                )}

                <div className="actions">
                    <Link to="/attendance" className="nav-link">
                        ✏️ Mark Attendance
                    </Link>
                    <Link to="/users" className="nav-link">
                        👥 Manage Users
                    </Link>
                    <Link to="/settings" className="nav-link">
                        ⚙️ Settings
                    </Link>
                    {hasLoaded && (
                        <>
                            <button
                                onClick={loadStats}
                                className="btn btn-secondary"
                                disabled={loading}
                            >
                                {loading ? 'Refreshing...' : '🔄 Refresh'}
                            </button>
                            <button
                                onClick={handleDownloadExcel}
                                className="btn btn-excel"
                                disabled={downloading || loading}
                            >
                                {downloading ? 'Downloading...' : '📊 Download Excel'}
                            </button>
                        </>
                    )}
                    <button
                        onClick={handleLogout}
                        className="btn btn-warning"
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
