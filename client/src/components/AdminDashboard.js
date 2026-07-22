import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  XCircle,
  PieChart,
  Pencil,
  Settings,
  LogOut,
  UserCog,
  BarChart3,
  CalendarDays,
  Download,
  RefreshCw,
} from "lucide-react";
import api from '../config/api';
import Alert from './Alert';

const AdminDashboard = ({ user, onLogout }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [, setDownloading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
    const hasLoadedRef = useRef(false);
    const navigate = useNavigate();

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get('/api/today-stats');
            setStats(response.data);
            setLastUpdated(new Date().toLocaleTimeString());
            setHasLoaded(true);

        } catch (error) {
            console.error('Error loading stats:', error);
            setError('Failed to load statistics. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login');
            return;
        }

        if (!hasLoadedRef.current) {
            hasLoadedRef.current = true;
            loadStats();
        }

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

    const statItems = stats ? [
        {
            title: "Total Students",
            value: String(stats.total || 0),
            subtitle: "Registered Students",
            color: "blue",
            icon: <Users size={28} />,
        },
        {
            title: "Present Today",
            value: String(stats.present || 0),
            subtitle: "Marked Present",
            color: "green",
            icon: <CheckCircle2 size={28} />,
        },
        {
            title: "Absent Today",
            value: String(stats.absent || 0),
            subtitle: "Marked Absent",
            color: "red",
            icon: <XCircle size={28} />,
        },
        {
            title: "Attendance %",
            value: stats.total > 0 ? `${Math.round((stats.present / stats.total) * 100)}%` : "0%",
            subtitle: "Overall Attendance",
            color: "purple",
            icon: <PieChart size={28} />,
        },
    ] : [];

    const actions = [
        {
            title: "Mark Attendance",
            subtitle: "Take attendance for today",
            color: "blue",
            icon: <Pencil size={22} />,
            onClick: () => navigate('/attendance'),
        },
        {
            title: "Manage Users",
            subtitle: "Add, edit and manage users",
            color: "violet",
            icon: <UserCog size={22} />,
            onClick: () => navigate('/users'),
        },
        {
            title: "Refresh Stats",
            subtitle: "Reload today's statistics",
            color: "green",
            icon: <RefreshCw size={22} />,
            onClick: loadStats,
        },
        {
            title: "Download Excel",
            subtitle: "Export attendance records",
            color: "purple",
            icon: <Download size={22} />,
            onClick: handleDownloadExcel,
        },
        {
            title: "Settings",
            subtitle: "Configure preferences",
            color: "green",
            icon: <Settings size={22} />,
            onClick: () => navigate('/settings'),
        },
        {
            title: "Logout",
            subtitle: "Sign out of account",
            color: "red",
            icon: <LogOut size={22} />,
            onClick: handleLogout,
        },
    ];

    return (
        <div className="h-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4 overflow-hidden">

            <div className="w-full h-full flex flex-col">

                {error && (
                    <div className="mb-6">
                        <Alert
                            message={error}
                            type="error"
                            onClose={() => setError(null)}
                        />
                    </div>
                )}

                {/* Header */}
                <div className="bg-white rounded-3xl shadow-xl p-6 flex-1 flex flex-col overflow-hidden">

                    <div className="flex flex-col items-center">

                        <img
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username || 'Admin'}`}
                            alt=""
                            className="w-16 h-16 rounded-full bg-blue-100"
                        />

                        <h1 className="text-3xl font-bold mt-4 text-gray-800">
                            Welcome back, Admin 👋
                        </h1>

                        <p className="text-xl mt-1 text-blue-600">
                            Hello, {user?.username || 'phoenixdev100'}
                        </p>

                        <div className="w-20 h-1 bg-blue-600 rounded-full mt-5"></div>

                        <p className="text-gray-500 mt-3 text-base">
                            Manage your attendance system efficiently.
                        </p>

                        {!hasLoaded ? (
                            <button
                                onClick={loadStats}
                                disabled={loading}
                                className="mt-4 flex items-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-xl shadow-lg transition text-sm"
                            >
                                <BarChart3 size={18} />
                                {loading ? 'Loading...' : 'Load Attendance Stats'}
                            </button>
                        ) : (
                            <div className="mt-4 flex items-center gap-4 text-gray-500 text-sm">
                                <span>Last updated: {lastUpdated}</span>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoRefreshEnabled}
                                        onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    Auto-refresh
                                </label>
                            </div>
                        )}

                    </div>

                    {/* Attendance */}
                    <div className="mt-6 bg-white border rounded-3xl p-6 shadow-sm">

                        <div className="flex justify-between items-center mb-8">

                            <h2 className="text-xl font-bold">
                                Today's Attendance Overview
                            </h2>

                            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl">

                                <CalendarDays size={20} />

                                {new Date().toLocaleDateString()}

                            </div>

                        </div>

                        {hasLoaded && stats ? (
                            <>
                                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

                                    {statItems.map((item) => (
                                        <div
                                            key={item.title}
                                            className={`rounded-2xl p-4 text-center shadow hover:shadow-xl transition
                                            ${
                                                item.color === "blue"
                                                    ? "bg-blue-50"
                                                    : item.color === "green"
                                                    ? "bg-green-50"
                                                    : item.color === "red"
                                                    ? "bg-red-50"
                                                    : "bg-purple-50"
                                            }`}
                                        >
                                            <div
                                                className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3
                                                ${
                                                    item.color === "blue"
                                                        ? "bg-blue-100 text-blue-600"
                                                        : item.color === "green"
                                                        ? "bg-green-100 text-green-600"
                                                        : item.color === "red"
                                                        ? "bg-red-100 text-red-600"
                                                        : "bg-purple-100 text-purple-600"
                                                }`}
                                            >
                                                {item.icon}
                                            </div>

                                            <h3 className="text-sm font-semibold">
                                                {item.title}
                                            </h3>

                                            <h1 className="text-3xl font-bold mt-2">
                                                {item.value}
                                            </h1>

                                            <p className="text-gray-500 text-sm mt-1">
                                                {item.subtitle}
                                            </p>
                                        </div>
                                    ))}

                                </div>

                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                Click "Load Attendance Stats" above to view today's attendance.
                            </div>
                        )}

                    </div>

                    {/* Quick Actions */}
                    <h2 className="text-2xl font-bold text-center mt-8 mb-4">
                        Quick Actions
                    </h2>

                    <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">

                        {actions.map((item) => (
                            <div
                                key={item.title}
                                onClick={item.onClick}
                                className="bg-white border rounded-2xl p-4 shadow hover:-translate-y-1 hover:shadow-xl transition cursor-pointer text-center"
                            >
                                <div
                                    className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3
                                    ${
                                        item.color === "blue"
                                            ? "bg-blue-100 text-blue-600"
                                            : item.color === "violet"
                                            ? "bg-violet-100 text-violet-600"
                                            : item.color === "green"
                                            ? "bg-green-100 text-green-600"
                                            : item.color === "purple"
                                            ? "bg-purple-100 text-purple-600"
                                            : "bg-red-100 text-red-600"
                                    }`}
                                >
                                    {item.icon}
                                </div>

                                <h3 className="text-base font-bold">
                                    {item.title}
                                </h3>

                                <p className="text-gray-500 text-xs mt-1">
                                    {item.subtitle}
                                </p>

                            </div>
                        ))}

                    </div>

                </div>

            </div>

        </div>
    );
};

export default AdminDashboard;
