import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import Alert from './Alert';

const AttendanceForm = () => {
  const [systemId, setSystemId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [inputType, setInputType] = useState('system'); // 'system' or 'team'
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

  useEffect(() => {
    // Focus on input when component mounts
    const input = document.getElementById('systemId');
    if (input) input.focus();
  }, []);

  // Auto-fetch team details when team ID changes
  useEffect(() => {
    if (inputType === 'team' && teamId.trim() && teamId.trim().length >= 4) {
      const timeoutId = setTimeout(() => {
        handleTeamLookup();
      }, 800); // 800ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      // Clear team selection if input is too short or switched to individual mode
      setShowTeamSelection(false);
      setTeamMembers([]);
      setTeamInfo(null);
      setSelectedMembers([]);
    }
  }, [teamId, inputType]);

  // Auto-fetch student details when system ID changes
  useEffect(() => {
    if (inputType === 'system' && systemId.trim() && systemId.trim().length >= 4) {
      const timeoutId = setTimeout(() => {
        handleStudentLookup();
      }, 800); // 800ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      // Clear student details if input is too short or switched to team mode
      setShowStudentDetails(false);
      setStudentInfo(null);
    }
  }, [systemId, inputType]);

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

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const currentId = inputType === 'system' ? systemId.trim() : teamId.trim();
    
    if (!currentId) {
      showAlert(
        <span><span className="alert-icon">📝</span>Please enter a {inputType === 'system' ? 'student system ID' : 'team ID'}</span>,
        'info'
      );
      return;
    }

    setLoading(true);
    hideAlert();

    try {
      const requestData = inputType === 'system' 
        ? { systemId: currentId }
        : { teamId: currentId };
        
      const response = await api.post('/api/mark-present', requestData);

      if (response.data.success) {
        let successMessage = (
          <div>
            <span className="alert-icon">✅</span>
            <strong>Attendance Recorded!</strong><br />
            {response.data.message}
            {response.data.student && (
              <div className="student-info">
                <strong>Student:</strong> {response.data.student.name} ({response.data.student.systemId})<br />
                <strong>Date:</strong> {formatDisplayDate(response.data.date)}<br />
                <strong>Status:</strong> Present ✓
              </div>
            )}
          </div>
        );
        
        showAlert(successMessage, 'success');
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
        let successMessage = (
          <div>
            <span className="alert-icon">❌</span>
            <strong>Marked as Absent!</strong><br />
            {response.data.message}
            {response.data.student && (
              <div className="student-info">
                <strong>Student:</strong> {response.data.student.name} ({response.data.student.systemId})<br />
                <strong>Date:</strong> {formatDisplayDate(response.data.date)}<br />
                <strong>Status:</strong> Absent ❌
              </div>
            )}
          </div>
        );
        
        showAlert(successMessage, 'warning');
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

  const handleTeamLookup = async () => {
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
        
        showAlert(
          <span><span className="alert-icon">👥</span>Team loaded: {response.data.team.team_name} ({response.data.totalMembers} members)</span>,
          'success'
        );
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      
      // Only show error alerts for user-initiated actions, not auto-lookup
      if (error.response && error.response.data) {
        showAlert(
          <span><span className="alert-icon">❌</span>{error.response.data.message}</span>,
          'error'
        );
      } else {
        showAlert(
          <span><span className="alert-icon">🌐</span>Network error. Please check your connection.</span>,
          'error'
        );
      }
      
      // Clear team selection on error
      setShowTeamSelection(false);
      setTeamMembers([]);
      setTeamInfo(null);
      setSelectedMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLookup = async () => {
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
        
        showAlert(
          <span><span className="alert-icon">👤</span>Student found: {response.data.student.name}{response.data.student.team_names ? ` (${response.data.student.team_names})` : ''}</span>,
          'success'
        );
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      
      if (error.response && error.response.data) {
        showAlert(
          <span><span className="alert-icon">❌</span>{error.response.data.message}</span>,
          'error'
        );
      } else {
        showAlert(
          <span><span className="alert-icon">🌐</span>Network error. Please check your connection.</span>,
          'error'
        );
      }
      
      // Clear student details on error
      setShowStudentDetails(false);
      setStudentInfo(null);
    } finally {
      setLoading(false);
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
        selectedStudents: selectedMembers
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

  // Clear alert when user starts typing
  const handleInputChange = (e) => {
    setSystemId(e.target.value);
    if (alert) {
      hideAlert();
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div className="logo-section">
            <div className="sih-logo">🇮🇳</div>
            <div className="title-section">
              <h1 className="main-title">SIH Attendance Tracker</h1>
              <p className="subtitle">Smart India Hackathon 2025</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="input-type-toggle">
              <button
                type="button"
                className={`toggle-btn ${inputType === 'system' ? 'active' : ''}`}
                onClick={() => setInputType('system')}
              >
                👤 Individual Student
              </button>
              <button
                type="button"
                className={`toggle-btn ${inputType === 'team' ? 'active' : ''}`}
                onClick={() => setInputType('team')}
              >
                👥 Entire Team
              </button>
            </div>
            
            <label htmlFor={inputType === 'system' ? 'systemId' : 'teamId'} className="form-label">
              {inputType === 'system' ? 'Student System ID:' : 'Team ID:'}
            </label>
            
            {inputType === 'system' ? (
              <div className="student-input-container">
                <input
                  type="text"
                  id="systemId"
                  value={systemId}
                  onChange={(e) => setSystemId(e.target.value)}
                  placeholder="Enter student system ID"
                  className={`form-input ${loading ? 'loading-input' : ''}`}
                  disabled={absentLoading}
                  autoComplete="off"
                />
                {loading && inputType === 'system' && (
                  <div className="input-loading-indicator">
                    <span className="loading-spinner">⏳</span>
                    <span className="loading-text">Loading student...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="team-input-container">
                <input
                  type="text"
                  id="teamId"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  placeholder="Enter team ID"
                  className={`form-input ${loading ? 'loading-input' : ''}`}
                  disabled={absentLoading}
                  autoComplete="off"
                />
                {loading && inputType === 'team' && (
                  <div className="input-loading-indicator">
                    <span className="loading-spinner">⏳</span>
                    <span className="loading-text">Loading team...</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="button-group">
            <button 
              type="submit" 
              className="btn btn-present"
              disabled={loading || absentLoading}
            >
              {loading ? 'Processing...' : '✓ Mark Present'}
            </button>
            
            <button 
              type="button"
              onClick={handleMarkAbsent}
              className="btn btn-warning"
              disabled={loading || absentLoading}
            >
              {absentLoading ? 'Processing...' : '❌ Mark Absent'}
            </button>
          </div>
        </form>

        {/* Student Details Interface */}
        {showStudentDetails && studentInfo && (
          <div className="student-details-section">
            <div className="student-header">
              <h3>👤 {studentInfo.name}</h3>
              <div className="student-meta">
                <span className="student-id-badge">{studentInfo.systemId}</span>
                {studentInfo.team_names && (
                  <span className="team-badge">Teams: {studentInfo.team_names}</span>
                )}
              </div>
            </div>

            <div className="attendance-status">
              <div className={`status-card ${studentInfo.isPresentToday ? 'present' : 'absent'}`}>
                <div className="status-icon">
                  {studentInfo.isPresentToday ? '✅' : '❌'}
                </div>
                <div className="status-info">
                  <div className="status-text">
                    {studentInfo.isPresentToday ? 'Present Today' : 'Not Present Today'}
                  </div>
                  {studentInfo.isPresentToday && studentInfo.recordedAt && (
                    <div className="recorded-time">
                      Recorded at: {new Date(studentInfo.recordedAt).toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Member Selection Interface */}
        {showTeamSelection && teamInfo && (
          <div className="team-selection-section">
            <div className="team-header">
              <h3>👥 {teamInfo.team_name}</h3>
              <p className="team-stats">
                {selectedMembers.length} of {teamMembers.length} members selected
              </p>
            </div>

            <div className="selection-controls">
              <button
                type="button"
                onClick={handleSelectAll}
                className="btn btn-secondary btn-small"
                disabled={loading}
              >
                ✅ Select All
              </button>
              <button
                type="button"
                onClick={handleSelectNone}
                className="btn btn-secondary btn-small"
                disabled={loading}
              >
                ❌ Select None
              </button>
            </div>

            <div className="team-members-grid">
              {teamMembers.map((member) => (
                <div
                  key={member.systemId}
                  className={`member-card ${selectedMembers.includes(member.systemId) ? 'selected' : ''} ${member.isPresentToday ? 'already-present' : ''}`}
                  onClick={() => handleMemberToggle(member.systemId)}
                >
                  <div className="member-info">
                    <div className="member-name">{member.name}</div>
                    <div className="member-id">{member.systemId}</div>
                  </div>
                  <div className="member-status">
                    {selectedMembers.includes(member.systemId) ? (
                      <span className="status-icon present">✅</span>
                    ) : (
                      <span className="status-icon absent">❌</span>
                    )}
                    {member.isPresentToday && (
                      <span className="already-marked">Already Present</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="team-submit-section">
              <button
                onClick={handleTeamAttendanceSubmit}
                className="btn btn-present btn-large"
                disabled={loading}
              >
                {loading ? 'Updating...' : '💾 Update Team Attendance'}
              </button>
            </div>
          </div>
        )}

        {(loading || absentLoading) && (
          <div className="loading">
            Processing...
          </div>
        )}

        {alert && (
          <Alert 
            message={alert.message} 
            type={alert.type} 
            onClose={hideAlert}
          />
        )}

        <div className="navigation-section">
          <Link to="/stats" className="nav-link">
            📊 View Today's Statistics
          </Link>
          <button 
            onClick={handleDownloadExcel} 
            className="btn btn-excel nav-button"
            disabled={downloading || loading || absentLoading}
          >
            {downloading ? 'Downloading...' : '📋 Download Excel'}
          </button>
        </div>
        
        <div className="footer">
          <p className="footer-text">
            Powered by <strong>Smart India Hackathon 2025</strong>
          </p>
          <p className="footer-subtext">
            Building Digital India 🇮🇳
          </p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceForm;
