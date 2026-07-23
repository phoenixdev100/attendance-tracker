import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Settings, Users, Clock3, Info, Lock } from "lucide-react";
import api from "../config/api";
import { useToast } from "../hooks/useToast";

export default function SettingsPage() {
  const [enabled, setEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeExpiresAt, setPasscodeExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");
  const navigate = useNavigate();
  const { showToast } = useToast();

  const loadSetting = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/settings/team_feature_enabled");
      if (response.data.success) {
        setEnabled(response.data.setting.value === true);
        if (response.data.setting.updated_at) {
          setLastUpdated(new Date(response.data.setting.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        }
      }
    } catch (error) {
      console.error("Error loading setting:", error);
      const message = error.response?.data?.message || "Failed to load setting";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSetting();
  }, [loadSetting]);

  const handleToggle = async () => {
    const newValue = !enabled;
    setSaving(true);
    try {
      const response = await api.put("/api/settings/team_feature_enabled", {
        value: newValue,
      });
      if (response.data.success) {
        setEnabled(newValue);
        if (response.data.setting?.updated_at) {
          setLastUpdated(new Date(response.data.setting.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        }
        showToast("Setting updated successfully", "success");
      } else {
        showToast(response.data.message || "Failed to update setting", "error");
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      const message = error.response?.data?.message || "Failed to update setting";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const loadPasscode = useCallback(async () => {
    try {
      const response = await api.get("/api/admin/passcode");
      if (response.data.success) {
        setPasscode(response.data.passcode || "");
        setPasscodeExpiresAt(response.data.expiresAt || null);
      }
    } catch (error) {
      console.error("Error loading passcode:", error);
      showToast("Failed to load passcode", "error");
    }
  }, [showToast]);

  useEffect(() => {
    loadPasscode();
  }, [loadPasscode]);

  useEffect(() => {
    if (!passcodeExpiresAt) {
      setTimeLeft("");
      return;
    }

    const updateTimeLeft = () => {
      const diff = new Date(passcodeExpiresAt) - new Date();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [passcodeExpiresAt]);

  const handleGeneratePasscode = async () => {
    setPasscodeLoading(true);
    try {
      const generated = Math.random().toString(36).substring(2, 8).toUpperCase();
      const response = await api.post("/api/admin/passcode", { passcode: generated });
      if (response.data.success) {
        setPasscode(response.data.passcode);
        setPasscodeExpiresAt(response.data.expiresAt || null);
        showToast("Passcode generated successfully", "success");
      } else {
        showToast(response.data.message || "Failed to generate passcode", "error");
      }
    } catch (error) {
      console.error("Error generating passcode:", error);
      showToast("Error generating passcode", "error");
    } finally {
      setPasscodeLoading(false);
    }
  };

  const handleSetPasscode = async () => {
    const trimmed = passcodeInput.trim();
    if (!trimmed) {
      showToast("Please enter a passcode", "warning");
      return;
    }

    setPasscodeLoading(true);
    try {
      const response = await api.post("/api/admin/passcode", { passcode: trimmed });
      if (response.data.success) {
        setPasscode(response.data.passcode);
        setPasscodeExpiresAt(response.data.expiresAt || null);
        setPasscodeInput("");
        showToast("Passcode set successfully", "success");
      } else {
        showToast(response.data.message || "Failed to set passcode", "error");
      }
    } catch (error) {
      console.error("Error setting passcode:", error);
      showToast("Error setting passcode", "error");
    } finally {
      setPasscodeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 relative overflow-hidden flex items-start sm:items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="absolute -top-20 -left-20 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-blue-200/40 blur-3xl"></div>
      <div className="absolute -bottom-20 -right-20 w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-indigo-300/30 blur-3xl"></div>

      <div className="w-full max-w-6xl relative">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white p-4 sm:p-6">

          <div className="flex flex-row items-center justify-between gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition"
            >
              <ArrowLeft size={20}/>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Settings className="text-blue-600" size={20}/>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
                <p className="text-slate-500 text-xs sm:text-sm">Manage system preferences</p>
              </div>
            </div>

            <button
              onClick={loadSetting}
              disabled={loading}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""}/>
            </button>
          </div>

          <hr className="my-4 sm:my-5"/>

          <div className="rounded-2xl border shadow p-3 sm:p-4 bg-white">
            <h2 className="text-base sm:text-lg font-bold">Feature Toggles</h2>
            <p className="text-slate-500 text-xs mt-0.5">Enable or disable features for regular users</p>

            <div className="mt-3 sm:mt-4 rounded-2xl bg-slate-50 border p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Users className="text-indigo-600" size={18}/>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold">Team Feature Enabled</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Enable/disable team attendance for regular users</p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-slate-500 text-xs">
                    <Clock3 size={12}/> Last updated: {lastUpdated ? lastUpdated : "Loading..."}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={handleToggle}
                  disabled={saving || loading}
                  className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition ${enabled ? "bg-green-500" : "bg-gray-300"} disabled:opacity-60`}
                >
                  <div className={`absolute top-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-white transition ${enabled ? "left-6 sm:left-7" : "left-1"}`}></div>
                </button>
                <span className={`text-sm sm:text-base font-bold ${enabled ? "text-green-600" : "text-red-500"}`}>
                  {enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 rounded-2xl border shadow p-3 sm:p-4 bg-white">
            <h2 className="text-base sm:text-lg font-bold">Attendance Passcode</h2>
            <p className="text-slate-500 text-xs mt-0.5">Generate a passcode for users to access attendance marking.</p>

            <div className="mt-3 sm:mt-4 rounded-2xl bg-indigo-50 border p-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div className="flex gap-2 sm:gap-3 items-center shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Lock className="text-indigo-600" size={18}/>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-bold">Today's Passcode</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Users must enter this to mark attendance.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                <div className="flex flex-row items-center gap-2 shrink-0">
                  {passcode ? (
                    <div className="h-7 sm:h-8 px-2 sm:px-3 flex items-center bg-white border border-indigo-200 rounded-lg text-sm sm:text-base font-mono font-bold text-indigo-600 tracking-widest">
                      {passcode}
                    </div>
                  ) : (
                    <div className="h-7 sm:h-8 flex items-center text-xs text-slate-500">No passcode set</div>
                  )}
                  {passcodeExpiresAt && (
                    <div className={`h-7 sm:h-8 flex items-center text-[10px] sm:text-xs px-2 rounded ${timeLeft === 'Expired' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {timeLeft}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      placeholder="Enter passcode"
                      disabled={passcodeLoading}
                      className="h-8 px-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 text-xs w-full sm:w-28"
                    />
                    <button
                      onClick={handleSetPasscode}
                      disabled={passcodeLoading}
                      className="h-8 flex items-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-3 rounded-lg text-xs font-semibold transition"
                    >
                      Set
                    </button>
                  </div>
                  <button
                    onClick={handleGeneratePasscode}
                    disabled={passcodeLoading}
                    className="h-8 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-3 rounded-lg text-xs font-semibold transition w-full sm:w-auto"
                  >
                    <RefreshCw size={14} className={passcodeLoading ? "animate-spin" : ""} />
                    {passcodeLoading ? "..." : "Generate"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 rounded-2xl border-l-4 border-blue-600 bg-gradient-to-r from-blue-50 to-white p-4 sm:p-5 shadow">
            <div className="flex gap-3 sm:gap-4">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Info className="text-blue-600" size={18}/>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold mb-1">About Settings</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  <strong>Team Feature Enabled:</strong> When enabled, regular users can mark attendance by team.
                  When disabled, only individual attendance is available. Admins always have access to both modes.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
