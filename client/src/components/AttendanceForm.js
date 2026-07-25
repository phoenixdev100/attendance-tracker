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
  ClipboardCheck,
  X,
  RefreshCw,
} from "lucide-react";
import api from '../config/api';
import { useToast } from '../hooks/useToast';

const AttendanceForm = ({ user, onLogout, isUserDashboard = false, showAdminNav = false, onAttendanceMarked }) => {
  const [systemId, setSystemId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [inputType, setInputType] = useState('student'); // 'student' or 'team'
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [teamInfo, setTeamInfo] = useState(null);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [teamFeatureEnabled, setTeamFeatureEnabled] = useState(true); // Default to true for admins
  const [markedCount, setMarkedCount] = useState(0);
  const [showAdminMarkedList, setShowAdminMarkedList] = useState(false);
  const [adminMarkedStudents, setAdminMarkedStudents] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // Define handleTeamLookup before it's used in useEffect
  const handleTeamLookup = useCallback(async () => {
    if (!teamId.trim()) {
      return;
    }

    setLoading(true);

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
  }, [teamId, showToast]);

  // Define handleStudentLookup before it's used in useEffect
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const loadAdminMarkedStudents = useCallback(async () => {
    if (!user?.id || user?.role !== 'admin') return;

    try {
      setAdminLoading(true);
      const response = await api.get(`/api/user-stats/${user.id}`);
      if (response.data) {
        setAdminStats(response.data);
        setAdminMarkedStudents(response.data.markedStudents || []);
      }
    } catch (error) {
      console.error('Error loading marked students:', error);
    } finally {
      setAdminLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminMarkedStudents();
      const interval = setInterval(loadAdminMarkedStudents, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadAdminMarkedStudents]);

  const handleStudentLookup = useCallback(async () => {
    if (!systemId.trim()) {
      return;
    }

    setLoading(true);

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
  }, [systemId, showToast]);

  useEffect(() => {
    // Focus on input when component mounts
    const input = document.getElementById('idInput');
    if (input) input.focus();
  }, [inputType]);

  // Load today's marked attendance count for admin
  useEffect(() => {
    if (user?.role === 'admin') {
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`attendanceCount_${today}_${user?.id}`);
      if (saved) {
        setMarkedCount(parseInt(saved, 10) || 0);
      } else {
        setMarkedCount(0);
      }
    }
  }, [user]);

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
      showToast(`Please enter a ${inputType === 'student' ? 'student system ID' : 'team ID'}`, 'info');
      return;
    }

    // In team mode, form submit should load the team instead of marking present
    if (inputType === 'team') {
      return handleTeamLookup();
    }

    setLoading(true);

    try {
      const requestData = inputType === 'student'
        ? { systemId: currentId, userId: user?.id }
        : { teamId: currentId, userId: user?.id };

      const response = await api.post('/api/mark-present', requestData);

      if (response.data.success) {
        showToast('Attendance marked successfully', 'success');
        setSystemId(''); // Clear input on success

        // Update today's marked count for admin
        if (user?.role === 'admin') {
          const today = new Date().toISOString().split('T')[0];
          const key = `attendanceCount_${today}_${user?.id}`;
          const newCount = markedCount + 1;
          setMarkedCount(newCount);
          localStorage.setItem(key, newCount.toString());
        }

        // Focus back on input
        setTimeout(() => {
          const input = document.getElementById('systemId');
          if (input) input.focus();
        }, 100);

        onAttendanceMarked?.();
      }

    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;
        let errorType = 'error';

        if (error.response.status === 404) {
          errorType = 'warning';
        } else if (error.response.status === 409) {
          errorType = 'warning';
        } else if (error.response.status === 400) {
          errorType = 'info';
        }

        showToast(data.message, errorType);
      } else {
        showToast('Network error. Please check your connection and try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleMarkAbsent = async () => {
    const trimmedId = systemId.trim();

    if (!trimmedId) {
      showToast('Please enter a student system ID to mark as absent', 'info');
      return;
    }

    setAbsentLoading(true);

    try {
      const response = await api.post('/api/mark-absent', {
        systemId: trimmedId
      });

      if (response.data.success) {
        showToast('Attendance Updated', 'success');
        setSystemId(''); // Clear input on success

        // Update today's marked count for admin
        if (user?.role === 'admin') {
          const today = new Date().toISOString().split('T')[0];
          const key = `attendanceCount_${today}_${user?.id}`;
          const newCount = markedCount + 1;
          setMarkedCount(newCount);
          localStorage.setItem(key, newCount.toString());
        }

        // Focus back on input
        setTimeout(() => {
          const input = document.getElementById('systemId');
          if (input) input.focus();
        }, 100);

        onAttendanceMarked?.();
      }

    } catch (error) {
      if (error.response && error.response.data) {
        const data = error.response.data;
        let errorType = 'error';

        if (error.response.status === 404) {
          errorType = 'warning';
        } else if (error.response.status === 409) {
          errorType = 'warning';
        } else if (error.response.status === 400) {
          errorType = 'info';
        }

        showToast(data.message, errorType);
      } else {
        showToast('Network error. Please check your connection and try again.', 'error');
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

      showToast('Excel file downloaded successfully', 'success');

    } catch (error) {
      showToast('Error downloading file. Please try again.', 'error');
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

    try {
      const response = await api.post('/api/mark-team-attendance', {
        teamId: teamInfo.team_id,
        selectedStudents: selectedMembers,
        userId: user?.id
      });

      if (response.data.success) {
        showToast(response.data.message || 'Team attendance updated', 'success');

        // Update today's marked count for admin
        if (user?.role === 'admin') {
          const today = new Date().toISOString().split('T')[0];
          const key = `attendanceCount_${today}_${user?.id}`;
          const added = selectedMembers.length;
          const newCount = markedCount + added;
          setMarkedCount(newCount);
          localStorage.setItem(key, newCount.toString());
        }

        // Refresh team data
        handleTeamLookup();

        onAttendanceMarked?.();
      }
    } catch (error) {
      if (error.response && error.response.data) {
        showToast(error.response.data.message, 'error');
      } else {
        showToast('Network error. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="h-screen w-full bg-gradient-to-br from-blue-50 via-white to-indigo-100 relative overflow-hidden p-3 sm:p-4">

      {/* Background */}
      <div className="absolute -top-40 -left-40 h-64 w-64 sm:h-96 sm:w-96 rounded-full bg-blue-200/40 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 h-80 w-80 sm:h-[450px] sm:w-[450px] rounded-full bg-indigo-300/30 blur-3xl"></div>

      <div className="max-w-3xl mx-auto h-full flex flex-col relative w-full">

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-[32px] shadow-2xl border border-white p-3 sm:p-4 md:p-6 flex-1 flex flex-col overflow-hidden">

          {/* Top bar: actions in corners, icon centered */}
          <div className="relative flex items-center justify-between shrink-0">

            {/* Left action */}
            <div>
              {showAdminNav ? (
                <button
                  onClick={() => navigate('/admin')}
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition px-2 sm:px-4 py-2 rounded-lg sm:rounded-xl font-semibold flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                >
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              ) : (
                !isUserDashboard && (
                  <button
                    onClick={handleDownloadExcel}
                    disabled={downloading || loading || absentLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-2 sm:px-4 py-2 rounded-lg sm:rounded-xl shadow-lg font-semibold flex items-center gap-1 sm:gap-2 text-xs sm:text-sm transition"
                  >
                    <Download size={16} />
                    {downloading ? '...' : <span className="hidden sm:inline">Excel</span>}
                  </button>
                )
              )}
            </div>

            {/* Center icon */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <CalendarCheck2 className="text-blue-600" size={24} />
              </div>
            </div>

            {/* Right action */}
            <button
              onClick={handleLogout}
              className="bg-orange-500 hover:bg-orange-600 text-white px-2 sm:px-4 py-2 rounded-lg sm:rounded-xl shadow-lg font-semibold flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Logout</span>
              <LogOut size={16} />
            </button>

          </div>

          {/* Header */}
          <div className="flex flex-col items-center mt-2">

            <h1 className="mt-2 sm:mt-3 text-2xl sm:text-3xl font-bold text-slate-800 text-center">
              Attendance Tracker
            </h1>

            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-500 text-center px-2">
              Mark attendance quickly and accurately
            </p>

            <div className="w-12 sm:w-16 h-1 rounded-full bg-blue-600 mt-2 sm:mt-3"></div>

            {user?.role === 'admin' && (
              <div className="mt-3 flex items-center gap-2 bg-blue-50 px-3 sm:px-4 py-2 rounded-xl border border-blue-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <ClipboardCheck className="text-blue-600" size={16} />
                </div>
                <div className="text-sm sm:text-base">
                  <span className="font-bold text-slate-800">{markedCount}</span>
                  <span className="text-slate-500 ml-1">marked today</span>
                </div>
              </div>
            )}

          </div>

          {/* Toggle */}
          {teamFeatureEnabled && (
            <div className="mt-3 sm:mt-4 grid grid-cols-2 rounded-2xl overflow-hidden border">
              <button
                onClick={() => setInputType('student')}
                className={`py-2 font-semibold flex justify-center items-center gap-1 sm:gap-2 transition text-xs sm:text-sm ${
                  inputType === 'student'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-blue-50'
                }`}
              >
                <User size={16} />
                <span className="hidden sm:inline">Individual Student</span>
                <span className="sm:hidden">Student</span>
              </button>

              <button
                onClick={() => setInputType('team')}
                className={`py-2 font-semibold flex justify-center items-center gap-1 sm:gap-2 transition text-xs sm:text-sm ${
                  inputType === 'team'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white hover:bg-blue-50'
                }`}
              >
                <Users size={16} />
                <span className="hidden sm:inline">Entire Team</span>
                <span className="sm:hidden">Team</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Input Card */}
            <div className="mt-3 sm:mt-4 bg-slate-50 rounded-2xl sm:rounded-3xl border p-3 sm:p-4 md:p-5">

              <label className="font-semibold text-sm sm:text-base flex items-center gap-2">
                {inputType === 'student'
                  ? 'Student System ID'
                  : 'Team ID'}

                <BadgeInfo size={14} className="text-slate-400" />
              </label>

              <div className="mt-2 sm:mt-3 flex items-center rounded-2xl border bg-white px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-blue-500">
                {inputType === 'student' ? (
                  <User className="text-blue-500" size={18} />
                ) : (
                  <Users className="text-blue-500" size={18} />
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
                  className="ml-2 sm:ml-3 w-full outline-none text-sm sm:text-base"
                />
              </div>

              <p className="mt-2 text-xs sm:text-sm text-slate-500">
                {inputType === 'student'
                  ? 'Enter the student\'s unique system ID.'
                  : 'Enter the registered team ID.'}
              </p>

              {loading && inputType === 'student' && (
                <p className="mt-2 text-xs sm:text-sm text-blue-600">Loading student...</p>
              )}
              {loading && inputType === 'team' && (
                <p className="mt-2 text-xs sm:text-sm text-blue-600">Loading team...</p>
              )}

            </div>

            {/* Buttons - only for individual student mode */}
            {inputType === 'student' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="submit"
                  disabled={loading || absentLoading}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 transition text-white rounded-xl py-2 font-semibold text-sm flex items-center justify-center gap-1 shadow"
                >
                  <CheckCircle2 size={16} />
                  {loading ? '...' : 'Present'}
                </button>

                <button
                  type="button"
                  onClick={handleMarkAbsent}
                  disabled={loading || absentLoading}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 transition text-white rounded-xl py-2 font-semibold text-sm flex items-center justify-center gap-1 shadow"
                >
                  <XCircle size={16} />
                  {absentLoading ? '...' : 'Absent'}
                </button>
              </div>
            )}

            {inputType === 'team' && (
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-500 text-center px-2">
                Select team members below and use <strong>Update Team Attendance</strong>.
              </p>
            )}
          </form>

          <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Student Details */}
          {showStudentDetails && studentInfo && (
            <div className="mt-2 bg-slate-50 rounded-lg p-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-800 truncate">{studentInfo.name}</h3>
                <div className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${studentInfo.isPresentToday ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {studentInfo.isPresentToday ? 'Present' : 'Absent'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <div className="bg-white rounded p-1.5">
                  <p className="text-[9px] text-slate-400">System ID</p>
                  <p className="text-[10px] font-semibold text-slate-700 truncate">{studentInfo.systemId}</p>
                </div>
                {studentInfo.dept && (
                  <div className="bg-white rounded p-1.5">
                    <p className="text-[9px] text-slate-400">Department</p>
                    <p className="text-[10px] font-semibold text-slate-700 truncate">{studentInfo.dept}</p>
                  </div>
                )}
                {studentInfo.section && (
                  <div className="bg-white rounded p-1.5">
                    <p className="text-[9px] text-slate-400">Section</p>
                    <p className="text-[10px] font-semibold text-slate-700 truncate">{studentInfo.section}</p>
                  </div>
                )}
                {studentInfo.team_names && (
                  <div className="bg-white rounded p-1.5 col-span-2">
                    <p className="text-[9px] text-slate-400">Team</p>
                    <p className="text-[10px] font-semibold text-slate-700 truncate">{studentInfo.team_names}</p>
                  </div>
                )}
              </div>
              {studentInfo.isPresentToday && studentInfo.recordedAt && (
                <div className="mt-1.5 text-[10px] text-slate-500">
                  {new Date(studentInfo.recordedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
                </div>
              )}
            </div>
          )}

          {/* Team Member Selection */}
          {showTeamSelection && teamInfo && (
            <div className="mt-3 bg-slate-50 rounded-xl p-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                <h3 className="text-sm font-bold text-slate-800 truncate">{teamInfo.team_name}</h3>
                <p className="text-slate-500 text-xs">
                  {selectedMembers.length} of {teamMembers.length} selected
                </p>
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] font-semibold"
                  disabled={loading}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleSelectNone}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-semibold"
                  disabled={loading}
                >
                  Select None
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {teamMembers.map((member) => (
                  <div
                    key={member.systemId}
                    onClick={() => handleMemberToggle(member.systemId)}
                    className={`p-1.5 rounded border cursor-pointer transition ${
                      selectedMembers.includes(member.systemId)
                        ? 'bg-green-50 border-green-500'
                        : 'bg-white border-slate-200'
                    } ${member.isPresentToday ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-semibold text-[10px] truncate">{member.name}</div>
                      {member.isPresentToday && (
                        <span className="text-[9px] text-green-600 font-medium whitespace-nowrap">Done</span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500 truncate">{member.systemId}</div>
                    {member.dept && (
                      <div className="text-[9px] text-slate-500 truncate">{member.dept}</div>
                    )}
                    {member.section && (
                      <div className="text-[9px] text-slate-500 truncate">{member.section}</div>
                    )}
                    {member.team_names && (
                      <div className="text-[9px] text-slate-500 truncate">{member.team_names}</div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleTeamAttendanceSubmit}
                disabled={loading}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-xl font-semibold transition text-xs"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
            </div>
          )}
          </div>

          {/* Footer */}
          <div className="mt-3 sm:mt-4 border-t pt-3 sm:pt-4 flex justify-center shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 text-slate-500 text-xs sm:text-sm">
              <CheckCircle2 className="text-blue-600" size={18} />
              <span className="font-medium">
                Secure • Reliable • Smart Attendance
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Admin marked students floating button */}
      {user?.role === 'admin' && showAdminNav && (
        <button
          onClick={() => setShowAdminMarkedList(true)}
          className="fixed bottom-6 left-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg w-11 h-11 flex items-center justify-center transition"
          title="My marked students"
        >
          <Users size={20} />
        </button>
      )}

      {/* Admin marked students popup */}
      {showAdminMarkedList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-xl font-bold text-slate-800">My Marked Students Today</h2>
                {adminStats && (
                  <p className="text-sm text-slate-500">{adminStats.date && new Date(adminStats.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadAdminMarkedStudents}
                  disabled={adminLoading}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
                  title="Refresh"
                >
                  <RefreshCw size={18} className={adminLoading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => setShowAdminMarkedList(false)}
                  className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto">
              {adminLoading && adminMarkedStudents.length === 0 ? (
                <div className="text-center text-slate-500 py-8">Loading your marked students...</div>
              ) : adminMarkedStudents.length > 0 ? (
                <div className="space-y-2">
                  {adminMarkedStudents.map((student) => (
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

export default AttendanceForm;
