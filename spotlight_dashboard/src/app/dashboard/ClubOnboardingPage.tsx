import { useState } from "react";
import { motion } from "motion/react";
import { createClub } from "../api";
import { useTheme } from "../theme";
import { FC, FM, FB, validatePasswordStrength } from "./shared";

export interface ClubOnboardingPageProps {
  onSuccess: (clubId: string) => void;
}

export function ClubOnboardingPage({ onSuccess }: ClubOnboardingPageProps) {
  const { isDark } = useTheme();
  const token = localStorage.getItem("spotlight_token");
  const [formData, setFormData] = useState({ name: "", email: "", logoUrl: "", password: "", registrationKey: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.registrationKey.trim()) {
      setError("Club Name, Contact Email, Mobile Login Password, and Authorization Key are required.");
      return;
    }
    const pwdCheck = validatePasswordStrength(formData.password);
    if (!pwdCheck.valid) {
      setError(pwdCheck.message);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await createClub({
        name: formData.name,
        email: formData.email,
        logoUrl: formData.logoUrl || "",
        clerkUserId: "",
        password: formData.password,
        registrationKey: formData.registrationKey.trim().toUpperCase(),
      }, token ?? undefined);

      if (res.club && res.club.id) {
        localStorage.setItem("show_first_time_notice", "true");
        window.dispatchEvent(new CustomEvent('spotlight:club_created'));
        onSuccess(res.club.id);
      } else {
        throw new Error("Failed to create club.");
      }
    } catch (e: any) {
      setError(e.message ?? "Onboarding failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 md:p-12 relative overflow-hidden" style={{ background: isDark ? "rgba(5,5,5,0.98)" : "var(--sk-canvas)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--sk-brand) 8%, transparent) 0%, transparent 60%)" }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-lg p-8 md:p-10 rounded-3xl relative z-10"
        style={{ 
          background: isDark ? "var(--sk-surface)" : "var(--sk-canvas)", 
          border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", 
          backdropFilter: "blur(24px)",
          boxShadow: isDark ? "none" : "0 20px 45px -10px var(--sk-raised)"
        }}
      >
        <div className="text-center mb-8">
          <p className="text-[11px] tracking-[0.5em] uppercase mb-2 text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold" style={{ fontFamily: FM }}>Step 1 · Onboarding</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-[color:var(--sk-fg)] dark:text-white mb-2" style={{ fontFamily: FC }}>Set Up Your Club</h2>
          <p className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FB }}>Welcome to Spotlight! Provide your club details and authorization key to activate the dashboard.</p>
        </div>

        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Authorization Key</label>
            <input 
              type="text" 
              placeholder="SPOTLIGHT-XXXX-XXXX" 
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all uppercase tracking-wider font-mono placeholder:normal-case placeholder:font-sans" 
              style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: "1px solid color-mix(in srgb, var(--sk-brand) 40%, transparent)" }} 
              value={formData.registrationKey} 
              onChange={e => setFormData(p => ({ ...p, registrationKey: e.target.value.toUpperCase() }))}
            />
            <div className="mt-2.5 space-y-1.5 text-left">
              <p className="text-xs text-[color:var(--sk-muted)] dark:text-white/70 leading-relaxed font-normal" style={{ fontFamily: FB }}>
                To request a key, email{" "}
                <a href="mailto:spotlightapp.help@gmail.com" className="text-emerald-700 dark:text-[#10B981] font-semibold hover:underline underline-offset-2">
                  spotlightapp.help@gmail.com
                </a>
              </p>
              <p className="text-xs text-[color:var(--sk-muted)] dark:text-white/60 leading-relaxed font-normal" style={{ fontFamily: FB }}>
                Requests must be submitted using an official club mail ID or student mail ID. Personal email requests will not be processed.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Club Name</label>
            <input 
              type="text" 
              placeholder="e.g. Turing Club" 
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" 
              style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", fontFamily: FB }} 
              value={formData.name} 
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Contact Email</label>
            <input 
              type="email" 
              placeholder="club@yourcollege.edu" 
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" 
              style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", fontFamily: FB }} 
              value={formData.email} 
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Club Logo URL (Optional)</label>
            <input 
              type="url" 
              placeholder="https://example.com/logo.png" 
              className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" 
              style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", fontFamily: FB }} 
              value={formData.logoUrl} 
              onChange={e => setFormData(p => ({ ...p, logoUrl: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold block" style={{ fontFamily: FM }}>Mobile App Login Password</label>
            <input 
              type="password" 
              placeholder="Create login password for mobile app" 
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-[color:var(--sk-fg)] dark:text-white outline-none transition-all" 
              style={{ background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", fontFamily: FB }} 
              value={formData.password} 
              onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
            />
          </div>

          {error && (
            <p className="text-xs text-[color:var(--sk-danger)] text-center font-medium" style={{ fontFamily: FM }}>{error}</p>
          )}

          <motion.button 
            type="submit"
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            disabled={submitting} 
            className="w-full py-3.5 bg-[color:var(--sk-brand)] hover:bg-[color:var(--sk-brand-hover)] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 mt-8 cursor-pointer" 
            style={{ fontFamily: FB }}
          >
            {submitting ? "Activating Dashboard..." : "Activate Dashboard"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
