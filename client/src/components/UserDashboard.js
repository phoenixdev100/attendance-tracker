import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import AttendanceForm from './AttendanceForm';

const UserDashboard = ({ user, onLogout }) => {
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is logged in
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        onLogout();
        navigate('/login');
    };

    return (
        <div>
            <AttendanceForm user={user} onLogout={handleLogout} isUserDashboard={true} />
        </div>
    );
};

export default UserDashboard;
