import { useState, useEffect, useCallback, useRef } from 'react';
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
import { useToast } from '../hooks/useToast';

const AdminDashboard = ({ user, onLogout }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [, setDownloading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
    const hasLoadedRef = useRef(false);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const loadStats = useCallback(async () => {
        try {
            setLoading(true);

            const response = await api.get('/api/today-stats');
            setStats(response.data);
            setLastUpdated(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
            setHasLoaded(true);

        } catch (error) {
            console.error('Error loading stats:', error);
            showToast('Failed to load statistics. Please check your connection and try again.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

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
    }, [user, navigate, autoRefreshEnabled, hasLoaded, loadStats]);

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
                responseType: 'blob',
                timeout: 60000
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
            showToast('Error downloading file. Please try again.', 'error');
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
        <div className="h-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-3 sm:p-4 overflow-hidden">

            <div className="w-full h-full flex flex-col">

                {/* Header */}
                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 flex-1 flex flex-col overflow-y-auto">

                    <div className="flex flex-col items-center shrink-0">

                        <img
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username || 'Admin'}`}
                            alt=""
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100"
                        />

                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mt-3 sm:mt-4 text-gray-800 text-center">
                            Welcome back, Admin 👋
                        </h1>

                        <p className="text-base sm:text-lg lg:text-xl mt-1 text-blue-600 text-center">
                            Hello, {user?.username || 'phoenixdev100'}
                        </p>

                        <div className="w-16 sm:w-20 h-1 bg-blue-600 rounded-full mt-4 sm:mt-5"></div>

                        <p className="text-gray-500 mt-2 sm:mt-3 text-sm sm:text-base text-center px-4">
                            Manage your attendance system efficiently.
                        </p>

                        {!hasLoaded ? (
                            <button
                                onClick={loadStats}
                                disabled={loading}
                                className="mt-3 sm:mt-4 flex items-center gap-2 sm:gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl shadow-lg transition text-sm"
                            >
                                <BarChart3 size={18} />
                                {loading ? 'Loading...' : 'Load Attendance Stats'}
                            </button>
                        ) : (
                            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-gray-500 text-xs sm:text-sm">
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
                    <div className="mt-4 sm:mt-6 bg-white border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm shrink-0">

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">

                            <h2 className="text-lg sm:text-xl font-bold">
                                Today's Attendance Overview
                            </h2>

                            <div className="flex items-center gap-2 bg-blue-50 px-3 sm:px-4 py-2 rounded-xl text-sm">

                                <CalendarDays size={18} />

                                {new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}

                            </div>

                        </div>

                        {hasLoaded && stats ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

                                    {statItems.map((item) => (
                                        <div
                                            key={item.title}
                                            className={`rounded-2xl p-3 sm:p-4 text-center shadow hover:shadow-xl transition
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
                                                className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-full flex items-center justify-center mb-2 sm:mb-3
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

                                            <h3 className="text-xs sm:text-sm font-semibold">
                                                {item.title}
                                            </h3>

                                            <h1 className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">
                                                {item.value}
                                            </h1>

                                            <p className="text-gray-500 text-xs mt-1">
                                                {item.subtitle}
                                            </p>
                                        </div>
                                    ))}

                                </div>

                            </>
                        ) : (
                            <div className="text-center py-8 sm:py-12 text-gray-500 text-sm">
                                Click "Load Attendance Stats" above to view today's attendance.
                            </div>
                        )}

                    </div>

                    {/* Quick Actions */}
                    <h2 className="text-xl sm:text-2xl font-bold text-center mt-6 sm:mt-8 mb-3 sm:mb-4">
                        Quick Actions
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">

                        {actions.map((item) => (
                            <div
                                key={item.title}
                                onClick={item.onClick}
                                className="bg-white border rounded-2xl p-3 sm:p-4 shadow hover:-translate-y-1 hover:shadow-xl transition cursor-pointer text-center"
                            >
                                <div
                                    className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-full flex items-center justify-center mb-2 sm:mb-3
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

                                <h3 className="text-sm sm:text-base font-bold">
                                    {item.title}
                                </h3>

                                <p className="text-gray-500 text-xs mt-1 hidden sm:block">
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
