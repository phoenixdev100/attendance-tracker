import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AttendanceForm from './AttendanceForm';
import api from '../config/api';

const UserDashboard = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const [markedStudents, setMarkedStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    const loadMarkedStudents = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            const response = await api.get(`/api/user-stats/${user.id}`);
            if (response.data) {
                setStats(response.data);
                setMarkedStudents(response.data.markedStudents || []);
            }
        } catch (error) {
            console.error('Error loading marked students:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        // Check if user is logged in
        if (!user) {
            navigate('/login');
            return;
        }

        // Load marked students
        loadMarkedStudents();

        // Refresh every 30 seconds
        const interval = setInterval(loadMarkedStudents, 30000);
        return () => clearInterval(interval);
    }, [user, navigate, loadMarkedStudents]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        onLogout();
        navigate('/login');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div>
            <AttendanceForm user={user} onLogout={handleLogout} isUserDashboard={true} />

            {/* My Marked Students Section */}
            <div className="container" style={{ marginTop: '20px' }}>
                <div className="card">
                    <div className="header">
                        <div className="title-section">
                            <h2 className="main-title">📋 My Marked Students Today</h2>
                            {stats && (
                                <p className="subtitle">{formatDate(stats.date)}</p>
                            )}
                        </div>
                    </div>

                    <div className="stats-grid" style={{ marginBottom: '20px' }}>
                        <div className="stat-card present">
                            <div className="stat-number">{markedStudents.length}</div>
                            <div className="stat-label">Students Marked</div>
                        </div>
                    </div>

                    {loading && markedStudents.length === 0 ? (
                        <div className="loading">Loading your marked students...</div>
                    ) : markedStudents.length > 0 ? (
                        <div className="present-students-section">
                            <h3 className="section-title">✓ Students You Marked Present</h3>
                            <div className="students-list">
                                {markedStudents.map((student) => (
                                    <div key={student.system_id} className="student-card">
                                        <div className="student-info-row">
                                            <div className="student-details">
                                                <div className="student-name">{student.name}</div>
                                                <div className="student-id">ID: {student.system_id}</div>
                                                {student.dept && (
                                                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '2px' }}>
                                                        {student.dept}
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
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                            <p style={{ fontSize: '1.1em', marginBottom: '10px' }}>📝 No students marked yet today</p>
                            <p style={{ fontSize: '0.9em' }}>Use the form above to mark students as present</p>
                        </div>
                    )}

                    <div className="actions" style={{ marginTop: '20px' }}>
                        <button
                            onClick={loadMarkedStudents}
                            className="btn btn-secondary"
                            disabled={loading}
                        >
                            {loading ? 'Refreshing...' : '🔄 Refresh List'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
