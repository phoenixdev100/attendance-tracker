import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, X, RefreshCw } from 'lucide-react';
import AttendanceForm from './AttendanceForm';
import api from '../config/api';
import { useToast } from '../hooks/useToast';

const UserDashboard = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [markedStudents, setMarkedStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [showList, setShowList] = useState(false);

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

    const validatePasscode = useCallback(async () => {
        const storedPasscode = localStorage.getItem('attendancePasscode');
        if (!storedPasscode) return;

        try {
            const response = await api.post('/api/validate-passcode', { passcode: storedPasscode });
            if (!response.data.valid) {
                localStorage.removeItem('attendancePasscode');
                showToast('Access denied: Passcode has been changed or expired', 'error');
                window.location.reload();
            }
        } catch (error) {
            console.error('Error validating passcode:', error);
            localStorage.removeItem('attendancePasscode');
            showToast('Access denied: Passcode validation failed', 'error');
            window.location.reload();
        }
    }, [showToast]);

    useEffect(() => {
        // Check if user is logged in
        if (!user) {
            navigate('/login');
            return;
        }

        // Load marked students
        loadMarkedStudents();

        // Refresh marked students every 30 seconds
        const interval = setInterval(loadMarkedStudents, 30000);

        // Validate passcode every 60 seconds
        const passcodeInterval = setInterval(validatePasscode, 60000);

        return () => {
            clearInterval(interval);
            clearInterval(passcodeInterval);
        };
    }, [user, navigate, loadMarkedStudents, validatePasscode]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        onLogout();
        navigate('/login');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div>
            <AttendanceForm user={user} onLogout={handleLogout} isUserDashboard={true} onAttendanceMarked={loadMarkedStudents} />

            <button
                onClick={() => setShowList(true)}
                className="fixed bottom-6 left-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg w-11 h-11 flex items-center justify-center transition"
                title="My marked students"
            >
                <Users size={20} />
            </button>

            {showList && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">My Marked Students Today</h2>
                                {stats && (
                                    <p className="text-sm text-slate-500">{formatDate(stats.date)}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={loadMarkedStudents}
                                    disabled={loading}
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
                                    title="Refresh"
                                >
                                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                                </button>
                                <button
                                    onClick={() => setShowList(false)}
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 overflow-y-auto">
                            {loading && markedStudents.length === 0 ? (
                                <div className="text-center text-slate-500 py-8">Loading your marked students...</div>
                            ) : markedStudents.length > 0 ? (
                                <div className="space-y-2">
                                    {markedStudents.map((student) => (
                                        <div key={student.system_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-slate-200 bg-slate-50 text-sm">
                                            <div className="flex items-center gap-2 min-w-0 truncate">
                                                <span className="font-semibold text-slate-800 truncate">{student.name}</span>
                                                <span className="text-slate-400">|</span>
                                                <span className="text-slate-500">{student.system_id}</span>
                                                {student.dept && (
                                                    <>
                                                        <span className="text-slate-400">|</span>
                                                        <span className="text-slate-500 truncate">{student.dept}</span>
                                                    </>
                                                )}
                                                {student.section && (
                                                    <>
                                                        <span className="text-slate-400">|</span>
                                                        <span className="text-slate-500 truncate">{student.section}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    Present
                                                </span>
                                                <span className="text-[10px] text-slate-500">
                                                    {new Date(student.recorded_at).toLocaleTimeString('en-IN', {
                                                        timeZone: 'Asia/Kolkata',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-500">
                                    <p className="text-lg mb-2">No students marked yet today</p>
                                    <p className="text-sm">Use the form above to mark students as present</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
