import { useState, useEffect } from 'react';
import { Lock, ArrowLeft, LogOut } from 'lucide-react';
import api from '../config/api';
import { useToast } from '../hooks/useToast';
import UserDashboard from './UserDashboard';

export default function PasscodeGate({ user, onLogout }) {
  const [passcode, setPasscode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const storedPasscode = localStorage.getItem('attendancePasscode');
    if (!storedPasscode) return;

    let cancelled = false;
    const validate = async () => {
      try {
        const response = await api.post('/api/validate-passcode', { passcode: storedPasscode });
        if (!cancelled && response.data.valid) {
          setVerified(true);
        } else if (!cancelled) {
          localStorage.removeItem('attendancePasscode');
        }
      } catch (error) {
        if (!cancelled) {
          localStorage.removeItem('attendancePasscode');
        }
      }
    };

    validate();
    return () => { cancelled = true; };
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    const trimmed = passcode.trim();
    if (!trimmed) {
      showToast('Please enter the passcode', 'warning');
      return;
    }

    setVerifying(true);
    try {
      const response = await api.post('/api/validate-passcode', { passcode: trimmed });
      if (response.data.valid) {
        localStorage.setItem('attendancePasscode', trimmed);
        setVerified(true);
      } else {
        showToast(response.data.message || 'Invalid passcode', 'error');
      }
    } catch (error) {
      showToast('Error validating passcode. Please try again.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('attendancePasscode');
    onLogout?.();
  };

  if (verified) {
    return <UserDashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-200/40 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-[450px] h-[450px] rounded-full bg-indigo-300/30 blur-3xl"></div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white p-8 relative">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Lock className="text-blue-600" size={32} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-800">Enter Passcode</h1>
          <p className="mt-2 text-sm text-slate-500 text-center">
            Ask your admin for today's attendance passcode.
          </p>
        </div>

        <form onSubmit={handleVerify} className="mt-6">
          <div className="flex items-center rounded-2xl border bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
            <Lock className="text-blue-500" size={20} />
            <input
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              disabled={verifying}
              autoComplete="off"
              className="ml-3 w-full outline-none text-base"
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-2xl font-semibold transition"
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <button
          onClick={() => window.history.back()}
          className="mt-4 w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 transition text-sm"
        >
          <ArrowLeft size={16} /> Go back
        </button>

        <button
          onClick={handleLogout}
          className="mt-3 w-full flex items-center justify-center gap-2 text-orange-500 hover:text-orange-600 transition text-sm"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
}
