import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Check, Upload, X, Mail } from "lucide-react";
import { updateClub, changePassword, sanitizeErrorMessage } from "../api";
import { FC, FM, FB, fileToBase64 } from "./shared";

export function SettingsPage({ club, profile, getToken, onUpdate, onLogout }: { club: any; profile: any; getToken: () => Promise<string | null>; onUpdate: () => void; onLogout: () => void }) {
  const user = profile;
  const isSocialLogin = false; 

  const [formData, setFormData] = useState({
    name: club?.name || "",
    email: club?.email || "",
    logoUrl: club?.logoUrl || "",
    upiId: club?.upiId || "",
    qrUrl: club?.qrUrl || ""
  });
  const isLogoUploaded = formData.logoUrl && formData.logoUrl !== "https://images.unsplash.com/photo-1516321318423-f06f85e504b3";
  const [qrFile, setQrFile] = useState<File | null>(null);

  const initialData = { name: club?.name || "", email: club?.email || "", upiId: club?.upiId || "" };

  useEffect(() => {
    if (club) {
      setFormData({
        name: club.name || "",
        email: club.email || "",
        logoUrl: club.logoUrl || "",
        upiId: club.upiId || "",
        qrUrl: club.qrUrl || ""
      });
    }
  }, [club]);

  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isDirty =
    formData.name !== (club?.name || "") ||
    formData.upiId !== (club?.upiId || "") ||
    !!logoFile ||
    !!qrFile;

  const [showPasswordUpdateModal, setShowPasswordUpdateModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordError(null);
    try {
      const token = await getToken();
      await changePassword({ oldPassword, newPassword }, token || undefined);

      setPasswordSuccess("Password updated successfully!");

      setTimeout(() => {
        setPasswordSuccess(null);
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmNewPassword(false);
        setShowPasswordUpdateModal(false);
      }, 1000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSaveInit = () => {
    if (!formData.name || !formData.email) {
      setError("Club name and email are required.");
      return;
    }
    setError(null);
    setPassword("");
    setShowPasswordPrompt(true);
  };

  const handleConfirmSave = async () => {
    if (!password) {
      setError("Password is required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      let finalQrUrl = formData.qrUrl;
      if (qrFile) {
        finalQrUrl = await fileToBase64(qrFile);
      }

      let finalLogoUrl = formData.logoUrl;
      if (logoFile) {
        finalLogoUrl = await fileToBase64(logoFile);
      }
      const token = await getToken();

      await updateClub(club.id, {
        ...formData,
        qrUrl: finalQrUrl,
        logoUrl: finalLogoUrl,
        password: password
      }, token || undefined);

      setShowPasswordPrompt(false);
      setPassword("");
      setSuccessMsg("Settings saved successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
      onUpdate();
    } catch (e: any) {
      setError(sanitizeErrorMessage(e, "Failed to update settings. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-5 md:p-8 lg:p-10 space-y-8 max-w-4xl relative">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-[color:var(--sk-fg)] dark:text-white" style={{ fontFamily: FC }}>Settings</h1>
      </div>

      <div className="space-y-6">
        
        <div className="p-6 md:p-8 rounded-3xl" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
          <h2 className="text-lg font-medium text-[color:var(--sk-fg)] dark:text-white mb-6" style={{ fontFamily: FB }}>Profile Settings</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Club Name</label>
              <input type="text" placeholder="e.g. Demo Club" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "var(--sk-line-strong)"} onBlur={e => e.currentTarget.style.borderColor = "var(--sk-line)"} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Contact Email</label>
              <input type="email" value={formData.email} disabled readOnly className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-muted)] dark:text-white/50 bg-[color:var(--sk-raised)] dark:bg-white/[0.01] border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] cursor-not-allowed outline-none select-none" style={{ fontFamily: FB }} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Club Logo</label>
              <input type="file" accept="image/*" className="hidden" id="logo-upload-settings" onChange={e => {
                const file = e.target.files?.[0];
                if (file) setLogoFile(file);
              }} />
              <label htmlFor="logo-upload-settings" className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-[color:var(--sk-muted)] flex items-center justify-between cursor-pointer transition-all hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/[0.04]" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }}>
                <span>{logoFile ? logoFile.name : (isLogoUploaded ? "Logo Uploaded (Click to change)" : "Upload Logo Image...")}</span>
                <Upload size={14} className={logoFile || isLogoUploaded ? "text-green-500" : ""} />
              </label>
              {!isLogoUploaded && !logoFile && (
                <p className="text-[11px] text-[color:var(--sk-danger)] mt-1.5 font-medium" style={{ fontFamily: FM }}>Logo not uploaded yet</p>
              )}
            </div>
          </div>
        </div>

        <div id="payment-settings" className="p-6 md:p-8 rounded-3xl" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
          <h2 className="text-lg font-medium text-[color:var(--sk-fg)] dark:text-white mb-6" style={{ fontFamily: FB }}>Payment Settings</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Default UPI ID</label>
              <input type="text" placeholder="club@upi" value={formData.upiId} onChange={e => setFormData(p => ({ ...p, upiId: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "var(--sk-line-strong)"} onBlur={e => e.currentTarget.style.borderColor = "var(--sk-line)"} />
              {!formData.upiId && (
                <p className="text-[11px] text-[color:var(--sk-brand)] mt-1.5 font-medium" style={{ fontFamily: FM }}>UPI ID not added yet</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Default QR Code</label>
              <input type="file" accept="image/*" className="hidden" id="qr-upload-settings" onChange={e => {
                const file = e.target.files?.[0];
                if (file) setQrFile(file);
              }} />
              <label htmlFor="qr-upload-settings" className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-[color:var(--sk-muted)] flex items-center justify-between cursor-pointer transition-all hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/[0.04]" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }}>
                <span>{qrFile ? qrFile.name : (formData.qrUrl ? "QR Uploaded (Click to change)" : "Upload QR Image...")}</span>
                <Upload size={14} className={qrFile || formData.qrUrl ? "text-green-500" : ""} />
              </label>
              {!formData.qrUrl && !qrFile && (
                <p className="text-[11px] text-[color:var(--sk-danger)] mt-1.5 font-medium" style={{ fontFamily: FM }}>QR Code not uploaded yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 rounded-3xl space-y-3" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[color:var(--sk-fg)] dark:text-white font-medium" style={{ fontFamily: FB }}>Save All Settings</p>
              <p className="text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>Apply updates to profile and payment settings.</p>
            </div>
            <button onClick={handleSaveInit} disabled={!isDirty || isSaving} className="px-6 py-2.5 bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand)]/80 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none" style={{ fontFamily: FB }}>Apply Changes</button>
          </div>
          <AnimatePresence>
            {successMsg && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-green-600 dark:text-green-400 text-sm font-medium pt-2 flex items-center justify-end gap-1.5" style={{ fontFamily: FB }}>
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 md:p-8 rounded-3xl" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[color:var(--sk-raised)] dark:bg-white/[0.04] border border-[color:var(--sk-line)] dark:border-white/[0.07]">
                <Mail size={18} className="text-[color:var(--sk-muted)] dark:text-white/60" />
              </div>
              <div>
                <p className="text-sm text-[color:var(--sk-fg)] dark:text-white font-medium" style={{ fontFamily: FB }}>Contact Us</p>
                <p className="text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] mt-0.5" style={{ fontFamily: FM }}>Reach out for support or queries</p>
              </div>
            </div>
            <a
              href="mailto:spotlightapp.help@gmail.com"
              className="px-5 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-xl transition-all"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", fontFamily: FB }}
            >
              spotlightapp.help@gmail.com
            </a>
          </div>
        </div>

        <AnimatePresence>
          {showPasswordPrompt && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-3xl p-8 bg-[color:var(--sk-surface)] dark:bg-[color:var(--sk-surface)] border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]">
                <h3 className="text-lg font-semibold text-[color:var(--sk-fg)] dark:text-white mb-2" style={{ fontFamily: FC }}>Confirm Changes</h3>
                <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] mb-6" style={{ fontFamily: FB }}>Please enter your club login password to save these updates.</p>

                <div className="space-y-1.5 mb-4">
                  <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Password</label>
                  <input autoFocus type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !isSaving) handleConfirmSave(); }} className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }} onFocus={e => e.currentTarget.style.borderColor = "var(--sk-line-strong)"} onBlur={e => e.currentTarget.style.borderColor = "var(--sk-line)"} />
                </div>

                {error && <p className="text-xs text-[color:var(--sk-danger)] font-medium mb-6 text-center" style={{ fontFamily: FB }}>{error}</p>}

                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => { setShowPasswordPrompt(false); setError(null); }} className="px-5 py-2.5 text-xs text-[color:var(--sk-fg)] dark:text-white bg-[color:var(--sk-raised)] dark:bg-white/5 hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/10 rounded-xl transition-all" style={{ fontFamily: FB }}>Cancel</button>
                  <button onClick={handleConfirmSave} disabled={isSaving} className="px-5 py-2.5 text-xs text-white bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand)]/80 rounded-xl transition-all font-semibold flex items-center gap-2 disabled:opacity-50" style={{ fontFamily: FB }}>
                    {isSaving ? "Saving..." : "Confirm Save"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPasswordUpdateModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-3xl p-8 bg-[color:var(--sk-surface)] dark:bg-[color:var(--sk-surface)] border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]">
                <h3 className="text-lg font-semibold text-[color:var(--sk-fg)] dark:text-white mb-2" style={{ fontFamily: FC }}>Change Password</h3>
                <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] mb-6" style={{ fontFamily: FB }}>Update your login credentials securely by entering your current and new password.</p>

                {passwordError && <p className="text-xs text-[color:var(--sk-danger)] font-medium mb-4 text-center" style={{ fontFamily: FB }}>{passwordError}</p>}

                <div className="space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-muted)] font-semibold block" style={{ fontFamily: FM }}>Old Password</label>
                    <div className="relative">
                      <input 
                        type={showOldPassword ? "text" : "password"} 
                        placeholder="Enter current password" 
                        value={oldPassword} 
                        onChange={e => setOldPassword(e.target.value)} 
                        className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" 
                        style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }} 
                        onFocus={e => e.currentTarget.style.borderColor = "var(--sk-line-strong)"} 
                        onBlur={e => e.currentTarget.style.borderColor = "var(--sk-line)"} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowOldPassword(!showOldPassword)} 
                        className="password-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] dark:text-white/40 dark:hover:text-white transition-colors bg-transparent border-0 outline-none p-1 cursor-pointer flex items-center justify-center"
                        style={{ background: "transparent", backgroundColor: "transparent", border: "none", boxShadow: "none" }}
                        aria-label={showOldPassword ? "Hide password" : "Show password"}
                      >
                        {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-muted)] font-semibold block" style={{ fontFamily: FM }}>New Password</label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        placeholder="Enter new password" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" 
                        style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }} 
                        onFocus={e => e.currentTarget.style.borderColor = "var(--sk-line-strong)"} 
                        onBlur={e => e.currentTarget.style.borderColor = "var(--sk-line)"} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)} 
                        className="password-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] dark:text-white/40 dark:hover:text-white transition-colors bg-transparent border-0 outline-none p-1 cursor-pointer flex items-center justify-center"
                        style={{ background: "transparent", backgroundColor: "transparent", border: "none", boxShadow: "none" }}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-muted)] font-semibold block" style={{ fontFamily: FM }}>Confirm New Password</label>
                    <div className="relative">
                      <input 
                        type={showConfirmNewPassword ? "text" : "password"} 
                        placeholder="Confirm new password" 
                        value={confirmNewPassword} 
                        onChange={e => setConfirmNewPassword(e.target.value)} 
                        className="w-full rounded-xl pl-4 pr-12 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" 
                        style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)", fontFamily: FB }} 
                        onFocus={e => e.currentTarget.style.borderColor = "var(--sk-line-strong)"} 
                        onBlur={e => e.currentTarget.style.borderColor = "var(--sk-line)"} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} 
                        className="password-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] dark:text-white/40 dark:hover:text-white transition-colors bg-transparent border-0 outline-none p-1 cursor-pointer flex items-center justify-center"
                        style={{ background: "transparent", backgroundColor: "transparent", border: "none", boxShadow: "none" }}
                        aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => { setShowPasswordUpdateModal(false); setPasswordError(null); setPasswordSuccess(null); setOldPassword(""); setNewPassword(""); setConfirmNewPassword(""); setShowOldPassword(false); setShowNewPassword(false); setShowConfirmNewPassword(false); }} className="px-5 py-2.5 text-xs text-[color:var(--sk-fg)] dark:text-white bg-[color:var(--sk-raised)] dark:bg-white/5 hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/10 rounded-xl transition-all" style={{ fontFamily: FB }}>Cancel</button>
                  <button 
                    onClick={handleUpdatePassword} 
                    disabled={isUpdatingPassword || !!passwordSuccess} 
                    className={`px-5 py-2.5 text-xs text-white rounded-xl transition-all font-semibold flex items-center gap-2 disabled:opacity-50 ${passwordSuccess ? 'bg-emerald-500 hover:bg-emerald-500' : 'bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand)]/80'}`} 
                    style={{ fontFamily: FB }}
                  >
                    {isUpdatingPassword ? (
                      "Updating..."
                    ) : passwordSuccess ? (
                      <>
                        <Check size={16} />
                        Updated
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPrivacyModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-2xl rounded-3xl p-8 max-h-[85vh] overflow-y-auto flex flex-col bg-[color:var(--sk-surface)] dark:bg-[color:var(--sk-surface)] border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[color:var(--sk-fg)] dark:text-white" style={{ fontFamily: FC }}>Dashboard Privacy Policy</h3>
                    <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] mt-1" style={{ fontFamily: FB }}>Last Updated: November 19, 2026</p>
                  </div>
                  <button onClick={() => setShowPrivacyModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center bg-[color:var(--sk-raised)] dark:bg-white/5 hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/10 text-[color:var(--sk-muted)] dark:text-white/60 hover:text-[color:var(--sk-fg)] dark:hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-sm text-[color:var(--sk-fg)] dark:text-[#ccc] leading-relaxed border-t border-b border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] py-6" style={{ fontFamily: FB }}>
                  <div>
                    <h4 className="text-[color:var(--sk-fg)] dark:text-white font-medium text-sm mb-2">About the Spotlight Club Dashboard</h4>
                    <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">The Spotlight Club Dashboard lets approved clubs create, publish and manage events. Published events appear in the Spotlight app and on the Spotlight student website. Clubs review registrations, check payment transaction IDs, and scan entry tickets.</p>
                  </div>

                  <div>
                    <h4 className="text-[color:var(--sk-fg)] dark:text-white font-medium text-sm mb-2">Information We Collect From Clubs</h4>
                    <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">We collect your club name, email address, password (stored only as a secure hash, or Google Sign-In instead), department, description, coordinator name and phone number, and logo. You can also add a UPI ID and payment QR code, and event details such as title, description, venue, dates, fee, capacity and banner image. New clubs can sign in only after the Spotlight admin approves their registration; the admin sees these details to decide.</p>
                  </div>

                  <div>
                    <h4 className="text-[color:var(--sk-fg)] dark:text-white font-medium text-sm mb-2">Club Authentication</h4>
                    <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">Clubs sign in with their email and password or with Google, only after admin approval. Passwords are stored only as secure hashes and sessions use signed tokens. Keep your credentials private.</p>
                  </div>

                  <div>
                    <h4 className="text-[color:var(--sk-fg)] dark:text-white font-medium text-sm mb-2">Participant Information Available to Clubs</h4>
                    <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">When students register for your events, you see their name, email, phone number, USN, branch, year, semester, team name, UPI Transaction ID (UTR), and registration and check-in status.</p>
                  </div>

                  <div>
                    <h4 className="text-[color:var(--sk-fg)] dark:text-white font-medium text-sm mb-2">Handling Participant Information</h4>
                    <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">Clubs must process participant data strictly to organize and conduct the event. You must not sell or share participant data with third parties, use it for unrelated spam/marketing, or store downloaded lists insecurely.</p>
                  </div>

                  <div>
                    <h4 className="text-[color:var(--sk-fg)] dark:text-white font-medium text-sm mb-2">Third-Party Services</h4>
                    <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">Render hosts the Spotlight server; GoDaddy hosts the database, website and uploaded images; Google provides optional Google Sign-In; and Gmail sends your approval email. Club logos, event banners and payment QR codes are public images that anyone with the link can view.</p>
                  </div>

                  <div>
                    <h4 className="text-[color:var(--sk-fg)] dark:text-white font-medium text-sm mb-2">Deleting Your Club Account</h4>
                    <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">To delete your club account and its data, email spotlightapp.help@gmail.com from your registered club email with the subject "Account Deletion Request". The club, its events, registrations and uploaded images are permanently deleted within 7 business days.</p>
                  </div>

                  <div>
                    <h4 className="text-[color:var(--sk-fg)] dark:text-white font-medium text-sm mb-2">Contact Us</h4>
                    <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">If you have concerns, deactivation requests, or reports of unauthorized dashboard activity, email support at <strong>spotlightapp.help@gmail.com</strong>.</p>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button onClick={() => setShowPrivacyModal(false)} className="px-6 py-2.5 text-xs text-[color:var(--sk-fg)] dark:text-white bg-[color:var(--sk-raised)] dark:bg-white/5 hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/10 rounded-xl transition-all font-semibold" style={{ fontFamily: FB }}>Close</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

         <div className="p-8 rounded-3xl" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
            <h2 className="text-lg font-medium text-[color:var(--sk-fg)] dark:text-white mb-6" style={{ fontFamily: FB }}>Privacy & Security</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[color:var(--sk-fg)] dark:text-white font-medium" style={{ fontFamily: FB }}>Change Password</p>
                  <p className="text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FM }}>
                    {isSocialLogin 
                      ? "Password managed by your social provider (Google)." 
                      : "Update your login credentials securely."}
                  </p>
                </div>
                {isSocialLogin ? (
                  <span className="px-3.5 py-1.5 bg-[color:var(--sk-raised)] dark:bg-white/5 text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] text-[10px] uppercase tracking-wider font-semibold rounded-lg border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]" style={{ fontFamily: FB }}>
                    Social Login
                  </span>
                ) : (
                  <button onClick={() => setShowPasswordUpdateModal(true)} className="px-4 py-2 bg-[color:var(--sk-raised)] dark:bg-white/5 hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/10 text-[color:var(--sk-fg)] dark:text-white text-xs font-semibold rounded-lg transition-all border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]" style={{ fontFamily: FB }}>Update</button>
                )}
              </div>
            </div>
          </div>

         <div className="p-8 rounded-3xl flex items-center justify-between" style={{ background: "var(--sk-surface)", border: "1px solid var(--sk-line)" }}>
           <div>
             <p className="text-sm font-medium text-[color:var(--sk-fg)] dark:text-white" style={{ fontFamily: FB }}>Privacy Policy</p>
           </div>
           <button onClick={() => setShowPrivacyModal(true)} className="px-6 py-2.5 bg-[color:var(--sk-raised)] dark:bg-white/5 hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/10 text-[color:var(--sk-fg)] dark:text-white text-xs font-semibold rounded-lg transition-all border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)]" style={{ fontFamily: FB }}>View Policy</button>
         </div>
      </div>
    </div>
  );
}
