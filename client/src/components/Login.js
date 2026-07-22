import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from "lucide-react";
import api from '../config/api';
import { useToast } from '../hooks/useToast';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            showToast('Please enter both email and password', 'warning');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/api/login', { email, password });
            const data = response.data;

            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', data.token);

                onLogin(data.user);

                if (data.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/attendance');
                }

                showToast('Login successful!', 'success');
            } else {
                showToast(data.message || 'Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            const message = error.response?.data?.message || 'Network error. Please try again.';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-indigo-100 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">

                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-600 text-white w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold">
                        A
                    </div>
                </div>

                {/* Heading */}
                <h1 className="text-3xl font-bold text-center text-gray-800">
                    Smart Attendance
                </h1>

                <p className="text-center text-gray-500 mt-2 mb-8">
                    Sign in to continue
                </p>

                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div className="mb-5">
                        <label className="block text-gray-700 font-medium mb-2">
                            Email
                        </label>

                        <div className="flex items-center border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
                            <Mail className="text-gray-400 mr-3" size={20} />
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full outline-none"
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="mb-8">
                        <label className="block text-gray-700 font-medium mb-2">
                            Password
                        </label>

                        <div className="flex items-center border rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
                            <Lock className="text-gray-400 mr-3" size={20} />
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full outline-none"
                                disabled={loading}
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition"
                    >
                        <LogIn size={20} />
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

            </div>
        </div>
    );
};

export default Login;
