import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { updateProfile } from '@/api/profiles';
import { useUserStore } from '@/store/userStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const schema = z.object({
  usn: z.string()
    .min(1, 'USN is required')
    .regex(/^[1-9][A-Z]{2}\d{2}[A-Z]{2}\d{3}$/i, 'Enter a valid USN (e.g., 1AB23CD456)'),
  branch: z.string().min(1, 'Please select your branch'),
  phone: z.string()
    .min(10, 'Enter a valid 10-digit phone number')
    .max(10, 'Enter a valid 10-digit phone number')
    .regex(/^\d+$/, 'Phone must contain only digits'),
});

type FormData = z.infer<typeof schema>;

const BRANCHES = ['CS', 'IS', 'EC', 'ME', 'CV', 'EE', 'AI', 'BT', 'Other'];

// Equivalent to Flutter's OnboardingScreen
// Shows after signup when profile is incomplete (missing USN/branch/phone)
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useUserStore();
  const userId = useAuthStore((s) => s.userId);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (data) => {
    if (!userId) return;
    try {
      const updated = await updateProfile({
        clerkUserId: userId,
        usn: data.usn.toUpperCase(),
        branch: data.branch,
        phone: data.phone,
      });
      setCurrentUser(updated);
      toast.success('Profile completed!');
      navigate('/', { replace: true });
    } catch (e) {
      toast.error(String(e).replace('Error: ', ''));
    }
  });

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: 'var(--color-crimson)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span style={{ fontSize: 28, color: '#fff' }}>👋</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
            Complete Your Profile
          </h1>
          <p style={{ color: 'var(--subtext)', fontSize: 14, lineHeight: 1.6 }}>
            Hi {currentUser?.name?.split(' ')[0] ?? 'there'}! A few more details to get you started.
          </p>
        </div>

        <div className="spotlight-card" style={{ padding: 28 }}>
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                USN *
              </label>
              <input
                {...register('usn')}
                type="text"
                placeholder="e.g. 1AB23CD456"
                className="input-field"
                style={{ textTransform: 'uppercase' }}
                autoCapitalize="characters"
              />
              {errors.usn && (
                <p style={{ color: 'var(--color-crimson)', fontSize: 12, marginTop: 4 }}>{errors.usn.message}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Branch *
              </label>
              <select {...register('branch')} className="input-field">
                <option value="">Select your branch</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {errors.branch && (
                <p style={{ color: 'var(--color-crimson)', fontSize: 12, marginTop: 4 }}>{errors.branch.message}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Phone Number *
              </label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="10-digit mobile number"
                className="input-field"
                maxLength={10}
              />
              {errors.phone && (
                <p style={{ color: 'var(--color-crimson)', fontSize: 12, marginTop: 4 }}>{errors.phone.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {isSubmitting ? (
                <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</>
              ) : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
