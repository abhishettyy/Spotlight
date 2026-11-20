import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, ChevronRight, ChevronLeft, ChevronDown, Check } from "lucide-react";
import { useTheme } from "../theme";
import { FM, FB } from "./shared";

export function GlassDatePicker({ value, onChange, defaultTime = "12:00" }: { value: string; onChange: (v: string) => void; defaultTime?: string }) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const dateObj = value ? new Date(value) : new Date();

  const [currentMonth, setCurrentMonth] = useState(dateObj.getMonth());
  const [currentYear, setCurrentYear] = useState(dateObj.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? dateObj : null);
  const [timeStr, setTimeStr] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
    }
    return defaultTime;
  });

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        setTimeStr(`${hh}:${mm}`);
      }
    } else {
      setSelectedDate(null);
      setTimeStr(defaultTime);
    }
  }, [value, defaultTime]);

  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDay = new Date(currentYear, currentMonth, 1).getDay();

  const handleSelectDate = (d: number) => {
    const newDate = new Date(currentYear, currentMonth, d);
    setSelectedDate(newDate);
    const dateString = `${newDate.getFullYear()}-${String(newDate.getMonth()+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onChange(`${dateString}T${timeStr}`);
  };

  const handleTimeChange = (e: any) => {
    const t = e.target.value;
    setTimeStr(t);
    if (!t) return;
    const targetDate = selectedDate || new Date(currentYear, currentMonth, new Date().getDate());
    const dateString = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    onChange(`${dateString}T${t}`);
  };

  return (
    <div className="relative">
      <div 
        onClick={() => setOpen(!open)} 
        className="w-full rounded-xl px-4 py-3 text-sm cursor-pointer flex items-center justify-between transition-all" 
        style={{ 
          background: isDark ? "var(--sk-surface)" : "var(--sk-raised)", 
          border: open ? (isDark ? "1px solid var(--sk-line-strong)" : "1px solid var(--sk-brand)") : (isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)"), 
          fontFamily: FB 
        }}
      >
        <span className={value ? (isDark ? "text-white" : "text-[color:var(--sk-fg)] font-medium") : (isDark ? "text-[color:var(--sk-muted)]" : "text-[color:var(--sk-muted)]")}>
          {value ? (() => { 
            const d = new Date(value); 
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; 
            const h = d.getHours() % 12 === 0 ? 12 : d.getHours() % 12; 
            const m = String(d.getMinutes()).padStart(2,'0'); 
            const ampm = d.getHours() >= 12 ? 'PM' : 'AM'; 
            return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}  ${h}:${m} ${ampm}`; 
          })() : "Select Date & Time"}
        </span>
        <Calendar size={14} className={isDark ? "text-[color:var(--sk-muted)]" : "text-[color:var(--sk-muted)]"} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 10 }} 
            className="absolute z-50 top-full mt-2 w-72 p-5 rounded-2xl left-0" 
            style={{ 
              background: isDark ? "rgba(15,15,15,0.98)" : "var(--sk-canvas)", 
              border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)", 
              backdropFilter: "blur(24px)",
              boxShadow: "none"
            }}
          >

            <div className="flex justify-between items-center mb-4">
              <button onClick={() => {
                if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
                else { setCurrentMonth(m => m - 1); }
              }} className="p-1 hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/10 rounded-md transition-colors text-[color:var(--sk-fg)] dark:text-white cursor-pointer"><ChevronLeft size={16} /></button>
              <div className="text-sm font-semibold text-[color:var(--sk-fg)] dark:text-white" style={{ fontFamily: FB }}>
                {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' })} {currentYear}
              </div>
              <button onClick={() => {
                if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
                else { setCurrentMonth(m => m + 1); }
              }} className="p-1 hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/10 rounded-md transition-colors text-[color:var(--sk-fg)] dark:text-white cursor-pointer"><ChevronRight size={16} /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {days.map(d => <div key={d} className="text-[11px] text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] font-semibold" style={{ fontFamily: FM }}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: numDays }).map((_, i) => {
                const d = i + 1;
                const isSelected = selectedDate?.getDate() === d && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;
                return (
                  <button key={d} type="button" onClick={() => handleSelectDate(d)} onDoubleClick={() => { handleSelectDate(d); setOpen(false); }} title="Double-click to pick and close" className={`w-8 h-8 mx-auto rounded-full text-xs flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-[color:var(--sk-brand)] text-white font-bold' : 'text-[color:var(--sk-fg)] hover:bg-[color:var(--sk-raised)] dark:text-[color:var(--sk-fg)] dark:hover:bg-white/10 dark:hover:text-white'}`} style={{ fontFamily: FB }}>
                    {d}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] flex items-center justify-between">
              <span className="text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)] font-semibold" style={{ fontFamily: FM }}>Time</span>
              <input type="time" className="bg-transparent border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] rounded-md px-2.5 py-1 text-xs text-[color:var(--sk-fg)] dark:text-white outline-none focus:border-[color:var(--sk-brand)] transition-all cursor-pointer" style={{ colorScheme: isDark ? "dark" : "light", fontFamily: FB, cursor: "pointer" }} value={timeStr} onChange={handleTimeChange} />
            </div>

            <div className="mt-4 pt-4 border-t border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] text-right">
              <button onClick={() => setOpen(false)} className="px-4 py-1.5 bg-[color:var(--sk-raised)] hover:bg-slate-300 text-[color:var(--sk-fg)] dark:bg-white/5 dark:hover:bg-white/10 dark:text-white text-xs rounded-lg transition-colors cursor-pointer font-semibold" style={{ fontFamily: FB }}>Done</button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface GlassSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

export function GlassSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error,
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  options: GlassSelectOption[];
  placeholder?: string;
  error?: string;
  className?: string;
}) {
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        className="glass-select-trigger w-full rounded-xl px-4 py-3 text-sm cursor-pointer flex items-center justify-between transition-all outline-none select-none"
        aria-invalid={!!error}
        style={{
          background: isDark ? "var(--sk-surface)" : "var(--sk-raised)",
          border: error
            ? "1px solid color-mix(in srgb, var(--sk-danger) 70%, transparent)"
            : open
              ? (isDark ? "1px solid var(--sk-line-strong)" : "1px solid var(--sk-brand)")
              : (isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)"),
          fontFamily: FB,
          boxShadow: open
            ? (isDark ? "0 0 0 1px color-mix(in srgb, var(--sk-brand) 40%, transparent)" : "0 0 0 1px color-mix(in srgb, var(--sk-brand) 30%, transparent)")
            : "none",
        }}
      >
        <span
          className={
            selectedOption
              ? (isDark ? "text-white font-medium" : "text-[color:var(--sk-fg)] font-semibold")
              : (isDark ? "text-[color:var(--sk-muted)]" : "text-[color:var(--sk-muted)]")
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center ml-2"
        >
          <ChevronDown
            size={16}
            className={open ? "text-[color:var(--sk-brand)]" : (isDark ? "text-white/40" : "text-[color:var(--sk-muted)]")}
          />
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 left-0 right-0 top-full rounded-xl p-1.5 backdrop-blur-xl overflow-hidden"
            style={{
              background: isDark ? "rgba(18, 18, 20, 0.98)" : "#ffffff",
              border: isDark ? "1px solid var(--sk-line)" : "1px solid var(--sk-line)",
              boxShadow: "none",
            }}
          >
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-lg text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? (isDark
                            ? "bg-[color:var(--sk-brand)]/15 text-white"
                            : "bg-[color:var(--sk-brand)]/10 text-[color:var(--sk-brand)]")
                        : (isDark
                            ? "hover:bg-white/5 text-[color:var(--sk-muted)] hover:text-white"
                            : "hover:bg-[color:var(--sk-raised)] text-[color:var(--sk-fg)] hover:text-[#0f172a]")
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm ${
                          isSelected ? "font-bold" : "font-medium"
                        }`}
                        style={{ fontFamily: FB }}
                      >
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                          style={{
                            background: isSelected
                              ? (isDark ? "color-mix(in srgb, var(--sk-brand) 30%, transparent)" : "color-mix(in srgb, var(--sk-brand) 20%, transparent)")
                              : (isDark ? "var(--sk-raised)" : "var(--sk-raised)"),
                            color: isSelected ? "var(--sk-brand)" : (isDark ? "var(--sk-muted)" : "var(--sk-faint)"),
                            fontFamily: FM,
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check
                        size={16}
                        className="text-[color:var(--sk-brand)] flex-shrink-0 ml-2"
                        strokeWidth={2.5}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
