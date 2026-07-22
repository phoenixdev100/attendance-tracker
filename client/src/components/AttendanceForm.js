import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Users,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  LogOut,
  CalendarCheck2,
  BadgeInfo,
  Download,
} from "lucide-react";
import api from '../config/api';
import Alert from './Alert';

const AttendanceForm = ({ user, onLogout, isUserDashboard = false, showAdminNav = false }) => {
  const [systemId, setSystemId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [inputType, setInputType] = useState('student'); // 'student' or 'team'
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [teamInfo, setTeamInfo] = useState(null);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [teamFeatureEnabled, setTeamFeatureEnabled] = useState(true); // Default to true for admins
  const [toast, setToast] = useState(null);


  const showAlert = (message, type, duration = null) => {
    setAlert({ message, type });

    // Auto-hide certain alert types
    if (duration || type === 'success' || type === 'info') {
      setTimeout(() => {
        setAlert(null);
      }, duration || (type === 'success' ? 7000 : 7000));
    } else if (type === 'warning') {
      setTimeout(() => {
        setAlert(null);
      }, 10000);
    }
  };

  const hideAlert = () => {
    setAlert(null);
  };

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Define handleTeamLookup before it's used in useEffect
  const handleTeamLookup = useCallback(async () => {
    if (!teamId.trim()) {
      return;
    }

    setLoading(true);
    hideAlert();

    try {
      const response = await api.get(`/api/team/${teamId.trim()}`);

      if (response.data.success) {
        setTeamInfo(response.data.team);
        setTeamMembers(response.data.members);
        setSelectedMembers(response.data.members.filter(m => m.isPresentToday).map(m => m.systemId));
        setShowTeamSelection(true);
      }
    } catch (error) {
      // Silently handle expected 404/not-found lookup errors

      if (error.response && error.response.data) {
        showToast(error.response.data.message, 'error');
      } else {
        showToast('Network error. Please check your connection.', 'error');
      }

      // Clear team selection on error
      setShowTeamSelection(false);
      setTeamMembers([]);
      setTeamInfo(null);
      setSelectedMembers([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  // Define handleStudentLookup before it's used in useEffect
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const handleStudentLookup = useCallback(async () => {
    if (!systemId.trim()) {
      return;
    }

    setLoading(true);
    hideAlert();

    try {
      const response = await api.get(`/api/student/${systemId.trim()}`);

      if (response.data.success) {
        setStudentInfo(response.data.student);
        setShowStudentDetails(true);
      }
    } catch (error) {
      // Silently handle expected 404/not-found lookup errors

      if (error.response && error.response.data) {
        showToast(error.response.data.message, 'error');
      } else {
        showToast('Network error. Please check your connection.', 'error');
      }

      // Clear student details on error
      setShowStudentDetails(false);
      setStudentInfo(null);
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  useEffect(() => {
    // Focus on input when component mounts
    const input = document.getElementById('idInput');
    if (input) input.focus();
  }, [inputType]);

  // Load settings to check if team feature is enabled
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Admins always have access to team feature
        if (user?.role === 'admin') {
          setTeamFeatureEnabled(true);
          return;
        }

        // For regular users, check the setting
        const response = await api.get('/api/settings/team_feature_enabled');
        if (response.data.success) {
          setTeamFeatureEnabled(response.data.setting.value);
          // If team feature is disabled, switch to student mode
          if (!response.data.setting.value && inputType === 'team') {
            setInputType('student');
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        // Default to false for users if error
        setTeamFeatureEnabled(false);
        setInputType('student');
      }
    };

    loadSettings();
  }, [user, inputType]);


  // Auto-fetch team details when team ID changes
  useEffect(() => {
    if (inputType === 'team' && teamId.trim() && teamId.trim().length >= 4) {
      const timeoutId = setTimeout(() => {
        handleTeamLookup();
      }, 1500); // 1.5s debounce

      return () => clearTimeout(timeoutId);
    } else {
      // Clear team selection if input is too short or switched to individual mode
      setShowTeamSelection(false);
      setTeamMembers([]);
      setTeamInfo(null);
      setSelectedMembers([]);
    }
  }, [teamId, inputType, handleTeamLookup]);

  // Auto-fetch student details when system ID changes
  useEffect(() => {
    if (inputType === 'student' && systemId.trim() && systemId.trim().length >= 4) {
      const timeoutId = setTimeout(() => {
        handleStudentLookup();
      }, 1500); // 1.5s debounce

      return () => clearTimeout(timeoutId);
    } else {
      // Clear student details if input is too short or switched to team mode
      setShowStudentDetails(false);
      setStudentInfo(null);
    }
  }, [systemId, inputType, handleStudentLookup]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentId = inputType === 'student' ? systemId.trim() : teamId.trim();

    if (!currentId) {
      showAlert(
        <span><span className="alert-icon">📝</span>Please enter a {inputType === 'student' ? 'student system ID' : 'team ID'}</span>,
        'info'
      );
      return;
    }

    // In team mode, form submit should load the team instead of marking present
    if (inputType === 'team') {
      return handleTeamLookup();
    }

    setLoading(true);
    hideAlert();

    try {
      const requestData = inputType === 'student'
        ? { systemId: currentId, userId: user?.id }
        : { teamId: currentId, userId: user?.id };

      const response = await api.post('/api/mark-present', requestData);

      if (response.data.success) {
        showToast('Attendance marked successfully', 'success');
        setSystemId(''); // Clear input on success

        // Focus back on input
        setTimeout(() => {
          const input = document.getElementById('systemId');
          if (input) input.focus();
        }, 100);
      }

    } catch (error) {
      console.error('Error:', error);

      if (error.response && error.response.data) {
        const data = error.response.data;
        let errorType = 'error';
        let icon = '❌';

        if (error.response.status === 404) {
          icon = '🔍';
          errorType = 'warning';
        } else if (error.response.status === 409) {
          icon = '⚠️';
          errorType = 'warning';
        } else if (error.response.status === 400) {
          icon = '📝';
          errorType = 'info';
        }

        showAlert(
          <span><span className="alert-icon">{icon}</span>{data.message}</span>,
          errorType
        );
      } else {
        showAlert(
          <span><span className="alert-icon">🌐</span>Network error. Please check your connection and try again.</span>,
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };


  const handleMarkAbsent = async () => {
    const trimmedId = systemId.trim();

    if (!trimmedId) {
      showAlert(
        <span><span className="alert-icon">📝</span>Please enter a student system ID to mark as absent</span>,
        'info'
      );
      return;
    }

    setAbsentLoading(true);
    hideAlert();

    try {
      const response = await api.post('/api/mark-absent', {
        systemId: trimmedId
      });

      if (response.data.success) {
        showToast('Attendance Updated', 'success');
        setSystemId(''); // Clear input on success

        // Focus back on input
        setTimeout(() => {
          const input = document.getElementById('systemId');
          if (input) input.focus();
        }, 100);
      }

    } catch (error) {
      console.error('Error:', error);

      if (error.response && error.response.data) {
        const data = error.response.data;
        let errorType = 'error';
        let icon = '❌';

        if (error.response.status === 404) {
          icon = '🔍';
          errorType = 'warning';
        } else if (error.response.status === 409) {
          icon = '⚠️';
          errorType = 'warning';
        } else if (error.response.status === 400) {
          icon = '📝';
          errorType = 'info';
        }

        showAlert(
          <span><span className="alert-icon">{icon}</span>{data.message}</span>,
          errorType
        );
      } else {
        showAlert(
          <span><span className="alert-icon">🌐</span>Network error. Please check your connection and try again.</span>,
          'error'
        );
      }
    } finally {
      setAbsentLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);

    try {
      const response = await api.get(`/api/export-excel`, {
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

      showAlert(
        <span><span className="alert-icon">📊</span>Excel file downloaded successfully!</span>,
        'success'
      );

    } catch (error) {
      console.error('Error downloading Excel file:', error);
      showAlert(
        <span><span className="alert-icon">❌</span>Error downloading file. Please try again.</span>,
        'error'
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleMemberToggle = (systemId) => {
    setSelectedMembers(prev =>
      prev.includes(systemId)
        ? prev.filter(id => id !== systemId)
        : [...prev, systemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedMembers(teamMembers.map(m => m.systemId));
  };

  const handleSelectNone = () => {
    setSelectedMembers([]);
  };

  const handleTeamAttendanceSubmit = async () => {
    setLoading(true);
    hideAlert();

    try {
      const response = await api.post('/api/mark-team-attendance', {
        teamId: teamInfo.team_id,
        selectedStudents: selectedMembers,
        userId: user?.id
      });

      if (response.data.success) {
        showAlert(
          <div>
            <span className="alert-icon">✅</span>
            <strong>Team Attendance Updated!</strong><br />
            {response.data.message}
          </div>,
          'success'
        );
        showToast('Team attendance updated', 'success');

        // Refresh team data
        handleTeamLookup();
      }
    } catch (error) {
      console.error('Error updating team attendance:', error);

      if (error.response && error.response.data) {
        showAlert(
          <span><span className="alert-icon">❌</span>{error.response.data.message}</span>,
          'error'
        );
      } else {
        showAlert(
          <span><span className="alert-icon">🌐</span>Network error. Please try again.</span>,
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="h-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-100 relative overflow-hidden p-4">

      {/* Background */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 h-[450px] w-[450px] rounded-full bg-indigo-300/30 blur-3xl"></div>

      <div className="max-w-3xl mx-auto h-full flex flex-col relative">

        {alert && (
          <div className="mb-3 shrink-0">
            <Alert
              message={alert.message}
              type={alert.type}
              onClose={hideAlert}
            />
          </div>
        )}

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white p-4 md:p-6 flex-1 flex flex-col overflow-hidden">

          {/* Top bar: actions in corners, icon centered */}
          <div className="relative flex items-center justify-between shrink-0">

            {/* Left action */}
            <div>
              {showAdminNav ? (
                <button
                  onClick={() => navigate('/admin')}
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm"
                >
                  <ArrowLeft />
                  Dashboard
                </button>
              ) : (
                !isUserDashboard && (
                  <button
                    onClick={handleDownloadExcel}
                    disabled={downloading || loading || absentLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-2 rounded-xl shadow-lg font-semibold flex items-center gap-2 text-sm transition"
                  >
                    <Download />
                    {downloading ? '...' : 'Excel'}
                  </button>
                )
              )}
            </div>

            {/* Center icon */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <CalendarCheck2 className="text-blue-600" size={32} />
              </div>
            </div>

            {/* Right action */}
            <button
              onClick={handleLogout}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl shadow-lg font-semibold flex items-center gap-2 text-sm"
            >
              Logout
              <LogOut />
            </button>

          </div>

          {/* Header */}
          <div className="flex flex-col items-center mt-2">

            <h1 className="mt-3 text-3xl font-bold text-slate-800">
              Attendance Tracker
            </h1>

            <p className="mt-2 text-base text-slate-500">
              Mark attendance quickly and accurately
            </p>

            <div className="w-16 h-1 rounded-full bg-blue-600 mt-3"></div>

          </div>

          {/* Toggle */}
          {teamFeatureEnabled && (
            <div className="mt-4 grid grid-cols-2 rounded-2xl overflow-hidden border">
              <button
                onClick={() => setInputType('student')}
                className={`py-2 font-semibold flex justify-center items-center gap-2 transition ${
                  inputType === 'student'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-blue-50'
                }`}
              >
                <User size={20} />
                Individual Student
              </button>

              <button
                onClick={() => setInputType('team')}
                className={`py-2 font-semibold flex justify-center items-center gap-2 transition ${
                  inputType === 'team'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-blue-50'
                }`}
              >
                <Users size={20} />
                Entire Team
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Input Card */}
            <div className="mt-4 bg-slate-50 rounded-3xl border p-4 md:p-5">

              <label className="font-semibold text-base flex items-center gap-2">
                {inputType === 'student'
                  ? 'Student System ID'
                  : 'Team ID'}

                <BadgeInfo size={16} className="text-slate-400" />
              </label>

              <div className="mt-3 flex items-center rounded-2xl border bg-white px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500">
                {inputType === 'student' ? (
                  <User className="text-blue-500" />
                ) : (
                  <Users className="text-blue-500" />
                )}

                <input
                  id="idInput"
                  type="text"
                  value={inputType === 'student' ? systemId : teamId}
                  onChange={(e) => inputType === 'student' ? setSystemId(e.target.value) : setTeamId(e.target.value)}
                  placeholder={
                    inputType === 'student'
                      ? 'Enter student system ID'
                      : 'Enter team ID'
                  }
                  disabled={absentLoading}
                  autoComplete="off"
                  className="ml-3 w-full outline-none text-base"
                />
              </div>

              <p className="mt-2 text-sm text-slate-500">
                {inputType === 'student'
                  ? 'Enter the student\'s unique system ID.'
                  : 'Enter the registered team ID.'}
              </p>

              {loading && inputType === 'student' && (
                <p className="mt-2 text-sm text-blue-600">Loading student...</p>
              )}
              {loading && inputType === 'team' && (
                <p className="mt-2 text-sm text-blue-600">Loading team...</p>
              )}

            </div>

            {/* Buttons - only for individual student mode */}
            {inputType === 'student' && (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <button
                  type="submit"
                  disabled={loading || absentLoading}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 transition text-white rounded-2xl py-3 font-semibold text-lg flex items-center justify-center gap-2 shadow-lg"
                >
                  <CheckCircle2 />
                  {loading ? 'Processing...' : 'Mark Present'}
                </button>

                <button
                  type="button"
                  onClick={handleMarkAbsent}
                  disabled={loading || absentLoading}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 transition text-white rounded-2xl py-3 font-semibold text-lg flex items-center justify-center gap-2 shadow-lg"
                >
                  <XCircle />
                  {absentLoading ? 'Processing...' : 'Mark Absent'}
                </button>
              </div>
            )}

            {inputType === 'team' && (
              <p className="mt-4 text-sm text-slate-500 text-center">
                Select team members below and use <strong>Update Team Attendance</strong>.
              </p>
            )}
          </form>

          <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Student Details */}
          {showStudentDetails && studentInfo && (
            <div className="mt-4 bg-blue-50 rounded-3xl p-4">
              <h3 className="text-xl font-bold text-slate-800">👤 {studentInfo.name}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="bg-white px-3 py-1 rounded-full text-sm font-medium">{studentInfo.systemId}</span>
                {studentInfo.dept && <span className="bg-white px-3 py-1 rounded-full text-sm font-medium">{studentInfo.dept}</span>}
                {studentInfo.team_names && <span className="bg-white px-3 py-1 rounded-full text-sm font-medium">Teams: {studentInfo.team_names}</span>}
              </div>
              <div className={`mt-4 p-4 rounded-2xl ${studentInfo.isPresentToday ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                <div className="font-bold text-lg">
                  {studentInfo.isPresentToday ? 'Present Today' : 'Not Present Today'}
                </div>
                {studentInfo.isPresentToday && studentInfo.recordedAt && (
                  <div className="text-sm mt-1">
                    Recorded at: {new Date(studentInfo.recordedAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Team Member Selection */}
          {showTeamSelection && teamInfo && (
            <div className="mt-4 bg-slate-50 rounded-3xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">👥 {teamInfo.team_name}</h3>
                <p className="text-slate-500 text-sm">
                  {selectedMembers.length} of {teamMembers.length} selected
                </p>
              </div>

              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                  disabled={loading}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleSelectNone}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold"
                  disabled={loading}
                >
                  Select None
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.systemId}
                    onClick={() => handleMemberToggle(member.systemId)}
                    className={`p-3 rounded-2xl border cursor-pointer transition ${
                      selectedMembers.includes(member.systemId)
                        ? 'bg-green-50 border-green-500'
                        : 'bg-white border-slate-200'
                    } ${member.isPresentToday ? 'opacity-75' : ''}`}
                  >
                    <div className="font-semibold text-sm">{member.name}</div>
                    <div className="text-xs text-slate-500">{member.systemId}</div>
                    {member.isPresentToday && (
                      <div className="text-xs text-green-600 font-medium mt-1">Already Present</div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleTeamAttendanceSubmit}
                disabled={loading}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-2xl font-semibold transition"
              >
                {loading ? 'Updating...' : 'Update Team Attendance'}
              </button>
            </div>
          )}
          </div>

          {/* Footer */}
          <div className="mt-4 border-t pt-4 flex justify-center shrink-0">
            <div className="flex items-center gap-3 text-slate-500">
              <CheckCircle2 className="text-blue-600" />
              <span className="font-medium">
                Secure • Reliable • Smart Attendance
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom-right toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium z-50 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-rose-500 text-slate-50'}`}>
          {toast.message}
        </div>
      )}

    </div>
  );
};

export default AttendanceForm;
