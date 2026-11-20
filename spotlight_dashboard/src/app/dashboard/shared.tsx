import { sanitizeErrorMessage } from "../api";
import { studentUrl } from "@student/basePath";

export const STUDENT_LOGIN_URL = studentUrl("/login");

export const FC = "var(--sk-font)";
export const F_LOGO = "'Space Grotesk', var(--sk-font)";
export const FM = "var(--sk-font)";
export const FB = "var(--sk-font)";

export type View = "landing" | "auth" | "dashboard";
export type AuthTab = "login" | "register";

export function parseLocalDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const matches = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (matches) {
    const [, year, month, day, hour, min, sec] = matches;
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      hour ? parseInt(hour, 10) : 0,
      min ? parseInt(min, 10) : 0,
      sec ? parseInt(sec, 10) : 0
    );
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateTime12H(dateStr?: string | null, includeTime: boolean = true): string {
  const d = parseLocalDate(dateStr);
  if (!d) return "TBD";

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthStr = months[d.getMonth()];
  const dayNum = d.getDate();
  const yearNum = d.getFullYear();
  const dateFormatted = `${monthStr} ${dayNum}, ${yearNum}`;

  if (!includeTime) return dateFormatted;

  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${dateFormatted} · ${h}:${m} ${ampm}`;
}

export const formatEventHeaderDate = (eventDateStr?: string | null, endDateStr?: string | null) => {
  const start = parseLocalDate(eventDateStr);
  if (!start) return "TBD";

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatDate = (d: Date) => `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const formatTime = (d: Date) => {
    let h = d.getHours() % 12;
    if (h === 0) h = 12;
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
    return `${h}:${m} ${ampm}`;
  };

  const end = parseLocalDate(endDateStr);
  if (!end) {
    return `${formatDate(start)} · ${formatTime(start)}`;
  }

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate()) {
    return `${formatDate(start)} · ${formatTime(start)} - ${formatTime(end)}`;
  } else {
    return `${formatDate(start)} · ${formatTime(start)} → ${formatDate(end)} · ${formatTime(end)}`;
  }
};

export function LiveDot() {
  return (
    <span className="relative flex h-2 w-2 items-center justify-center flex-shrink-0">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"
        style={{
          willChange: "transform, opacity",
          transform: "translateZ(0)",
          animationDuration: "1.2s",
        }}
      />
      <span
        className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"
        style={{ transform: "translateZ(0)" }}
      />
    </span>
  );
}

export function LiveTag({ size = "normal" }: { size?: "normal" | "large" }) {
  if (size === "large") {
    return (
      <span
        className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] uppercase text-red-400 px-1 py-0.5"
        style={{ fontFamily: FM, transform: "translateZ(0)" }}
      >
        <LiveDot />
        LIVE NOW
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-red-400 px-1 py-0.5"
      style={{ fontFamily: FM, transform: "translateZ(0)" }}
    >
      <LiveDot />
      LIVE NOW
    </span>
  );
}

export function getEventStatus(event?: { eventDate?: string | null; date?: string | null; eventEndDate?: string | null; status?: string } | null): "upcoming" | "live" | "previous" {
  if (!event) return "previous";
  const startStr = event.eventDate || event.date;
  const start = parseLocalDate(startStr);
  if (!start) return (event.status as any) || "upcoming";

  const now = new Date();
  const end = parseLocalDate(event.eventEndDate) || new Date(start.getTime() + 3 * 60 * 60 * 1000);

  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "previous";
}

export interface ClubEvent {
  id: string;
  title: string;
  date: string | null;
  eventDate?: string | null;
  eventEndDate?: string | null;
  venue: string;
  capacity: number;
  type: string;
  eventType?: string | null;
  club: string;
  club_id: string | null;
  status: "upcoming" | "previous" | "live";
  price: number;
  bannerUrl?: string | null;
  qrUrl?: string | null;
  registrationDeadline?: string | null;
  pendingCount?: number;
  /** Saved but not published: hidden from students until the club publishes it */
  isDraft?: boolean;
  description?: string | null;
  teamSizeLimit?: number | null;
  minTeamSize?: number | null;
}

/**
 * Places taken, which is what capacity limits: one per solo student and one per team, counting
 * only pending and confirmed registrations (the same count the server uses).
 */
export function countPlaces(regs: Registration[]): number {
  const active = regs.filter(r => r.status?.toUpperCase() === "PENDING" || r.status?.toUpperCase() === "CONFIRMED");
  const teamIds = new Set(active.filter(r => r.team?.id).map(r => r.team!.id));
  return active.filter(r => !r.team?.id).length + teamIds.size;
}

export interface Registration {
  id: string;
  status: string;
  checkedInAt?: string | Date | null;
  created_at: string;
  eventTitle: string;
  eventId: string;
  user: { id: string; name: string; email: string; usn: string; branch: string; phone: string; year?: number | null; sem?: number | null } | null;
  team: { id: string; name: string; passkey: string; leaderId?: string | null } | null;
  transaction_id?: string | null;
}

export function formatAuthError(err: any, defaultMsg: string): string {
  return sanitizeErrorMessage(err, defaultMsg);
}

export function validatePasswordStrength(pass: string): { valid: boolean; message: string | null } {
  const missing: string[] = [];
  if (pass.length < 8) missing.push("at least 8 characters");
  if (!/[A-Z]/.test(pass)) missing.push("at least one uppercase letter");
  if (!/[0-9]/.test(pass)) missing.push("at least one number");
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) missing.push("at least one special character");

  if (missing.length > 0) {
    return {
      valid: false,
      message: `Password must contain ${missing.join(", ")}.`
    };
  }
  return { valid: true, message: null };
}

/** Shown while a page's code is still downloading (pages are loaded on demand). */
/** Reads an image as a data URL, scaled to at most 1200px and re-encoded as JPEG to keep uploads small. */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
};


export function PageFallback() {
  return (
    <div className="flex justify-center py-24" role="status" aria-label="Loading">
      <div className="w-6 h-6 rounded-full border-2 border-[color:var(--sk-brand)] border-t-transparent animate-spin" />
    </div>
  );
}
