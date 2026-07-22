import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import { useToast } from '../hooks/useToast';

const SettingsManagement = () => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const [hasLoaded, setHasLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/settings');
            setSettings(response.data.settings);
            setHasLoaded(true);
        } catch (error) {
            console.error('Error loading settings:', error);
            showToast('Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (key, currentValue) => {
        setSaving(true);
        try {
            const response = await api.put(`/api/settings/${key}`, {
                value: !currentValue
            });

            if (response.data.success) {
                // Update local state
                setSettings(prev => ({
                    ...prev,
                    [key]: {
                        ...prev[key],
                        value: !currentValue
                    }
                }));
                showToast('Setting updated successfully!', 'success');
            }
        } catch (error) {
            console.error('Error updating setting:', error);
            const message = error.response?.data?.message || 'Failed to update setting';
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="user-management">
            <div className="user-management-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Link to="/admin" className="btn btn-secondary">
                        ← Back to Dashboard
                    </Link>
                    <h2>⚙️ Settings</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {hasLoaded && (
                        <button onClick={loadSettings} className="btn btn-secondary" disabled={loading}>
                            {loading ? 'Loading...' : '🔄 Refresh'}
                        </button>
                    )}
                </div>
            </div>

            {!hasLoaded ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <h3 style={{ color: '#666', marginBottom: '20px' }}>Click below to load settings</h3>
                    <button onClick={loadSettings} className="btn btn-present" disabled={loading} style={{ minWidth: '200px' }}>
                        {loading ? 'Loading...' : '⚙️ Load Settings'}
                    </button>
                </div>
            ) : (
                <div className="settings-container">
                    <div className="settings-section">
                        <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Feature Toggles</h3>

                        {Object.keys(settings).length === 0 ? (
                            <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>No settings found</p>
                        ) : (
                            <div className="settings-list">
                                {Object.entries(settings).map(([key, setting]) => (
                                    <div key={key} className="setting-item">
                                        <div className="setting-info">
                                            <div className="setting-title">
                                                {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </div>
                                            <div className="setting-description">{setting.description}</div>
                                            {setting.updated_at && (
                                                <div className="setting-updated">
                                                    Last updated: {new Date(setting.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                                </div>
                                            )}
                                        </div>
                                        <div className="setting-control">
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={setting.value}
                                                    onChange={() => handleToggle(key, setting.value)}
                                                    disabled={saving}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                            <span className={`status-text ${setting.value ? 'enabled' : 'disabled'}`}>
                                                {setting.value ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="settings-info" style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <h4 style={{ marginTop: 0, color: '#2c3e50' }}>ℹ️ About Settings</h4>
                        <ul style={{ marginBottom: 0, paddingLeft: '20px', color: '#666' }}>
                            <li><strong>Team Feature Enabled:</strong> When enabled, regular users can mark attendance by team. When disabled, only individual attendance marking is available to users (admins always have access to both).</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsManagement;
