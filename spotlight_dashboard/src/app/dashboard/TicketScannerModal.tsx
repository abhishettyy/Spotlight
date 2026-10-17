import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle, X, AlertTriangle, Camera, RotateCcw } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { verifyTicketQR } from "../api";
import { FM, FB } from "./shared";

export function TicketScannerModal({
  activeEvent,
  getToken,
  onClose,
  onScanSuccess,
  scannerKey,
}: {
  activeEvent: any;
  getToken: () => Promise<string | null>;
  onClose: () => void;
  onScanSuccess?: (ticket: any) => void;
  scannerKey?: number;
}) {
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState<string | null>(null);

  useEffect(() => {
    setScanResult(null);
    setScanError(null);
    setManualCode("");
    setAlreadyCheckedIn(null);
  }, [scannerKey]);

  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;
    const elementId = "qr-reader-canvas";

    const startScanner = async () => {
      try {
        html5Qrcode = new Html5Qrcode(elementId);
        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 25,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdge * 0.85);
              return { width: Math.max(qrboxSize, 180), height: Math.max(qrboxSize, 180) };
            },
            aspectRatio: 1.0,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            }
          } as any,
          async (decodedText) => {
            if (decodedText) {
              if (html5Qrcode && html5Qrcode.isScanning) {
                await html5Qrcode.stop().catch(() => {});
              }
              handleProcessTicket(decodedText);
            }
          },
          () => {}
        );
      } catch (err: any) {
        console.warn("[QR Scanner] Camera initialize warning:", err);
      }
    };

    if (!scanResult && !alreadyCheckedIn && !scanError) {
      const timer = setTimeout(startScanner, 150);
      return () => {
        clearTimeout(timer);
        if (html5Qrcode && html5Qrcode.isScanning) {
          html5Qrcode.stop().catch(() => {});
        }
      };
    }
  }, [scanResult, alreadyCheckedIn, scanError]);

  const handleProcessTicket = async (ticketId: string) => {
    if (!ticketId.trim()) return;
    setLoading(true);
    setScanError(null);
    setAlreadyCheckedIn(null);
    try {
      const token = await getToken();
      const res = await verifyTicketQR(ticketId.trim(), activeEvent.id, token ?? undefined);
      if (res.valid && res.alreadyCheckedIn) {
        setAlreadyCheckedIn(res.message || 'This ticket has already been checked in.');
      } else if (res.valid && res.ticket) {
        setScanResult(res.ticket);
        if (onScanSuccess) {
          onScanSuccess(res.ticket);
        }
      } else {
        setScanError(res.error || "Unrecognized or invalid ticket.");
      }
    } catch (err: any) {
      setScanError(err.message || "Failed to verify ticket QR code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-[color:var(--sk-brand)]/20 bg-[color:var(--sk-brand)]/[0.03] overflow-hidden"
    >
      
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[color:var(--sk-line)] dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Camera size={16} className="text-[color:var(--sk-brand)]" />
          <span className="text-sm font-semibold text-[color:var(--sk-fg)] dark:text-white" style={{ fontFamily: FB }}>
            Scan Ticket QR
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider" style={{ fontFamily: FM }}>
            Live
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[color:var(--sk-muted)] hover:text-[color:var(--sk-fg)] dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/10"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5">
        {alreadyCheckedIn ? (
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                    <path d="M12 8v4"/>
                    <path d="M12 16h.01"/>
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-amber-600 dark:text-amber-400" style={{ fontFamily: FM }}>
                    ALREADY CHECKED IN
                  </span>
                  <p className="text-sm font-semibold text-[color:var(--sk-fg)] dark:text-white mt-0.5" style={{ fontFamily: FB }}>
                    {alreadyCheckedIn}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setAlreadyCheckedIn(null); setScanError(null); setManualCode(""); }}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-[color:var(--sk-raised)] hover:bg-slate-300 text-[color:var(--sk-fg)] dark:bg-white/10 dark:hover:bg-white/20 dark:text-white transition-all cursor-pointer font-semibold border border-[color:var(--sk-line)] dark:border-transparent"
                style={{ fontFamily: FB }}
              >
                Scan Next Ticket
              </button>
            </div>
          </div>
        ) : !scanResult ? (
          <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
            
            <div className="flex-shrink-0 flex flex-col items-center mx-auto lg:mx-0">
              <div
                className="relative rounded-2xl overflow-hidden bg-black border border-white/10"
                style={{ width: 280, height: 280 }}
              >
                <div id="qr-reader-canvas" className="w-full h-full" />

                {/* Professional Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 p-4">
                  {/* Subtle Laser Scanline */}
                  <div className="absolute inset-x-4 h-[1.5px] bg-gradient-to-r from-transparent via-[color:var(--sk-brand)] to-transparent animate-scanlaser pointer-events-none opacity-80" />

                  {/* Elegant Corner Guides */}
                  <div className="absolute top-4 left-4 w-5 h-5 border-t border-l border-white/40 rounded-tl" />
                  <div className="absolute top-4 right-4 w-5 h-5 border-t border-r border-white/40 rounded-tr" />
                  <div className="absolute bottom-4 left-4 w-5 h-5 border-b border-l border-white/40 rounded-bl" />
                  <div className="absolute bottom-4 right-4 w-5 h-5 border-b border-r border-white/40 rounded-br" />
                </div>

                {loading && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
                    <div className="w-7 h-7 border-2 border-[color:var(--sk-brand)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-white/80 font-medium" style={{ fontFamily: FB }}>Verifying Ticket...</p>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-[color:var(--sk-muted)] dark:text-white/30 mt-2 text-center" style={{ fontFamily: FB }}>
                Point camera at attendee's QR code
              </p>
            </div>

            {/* Manual Entry */}
            <div className="flex-1 flex flex-col justify-center gap-4 w-full text-center lg:text-left">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[color:var(--sk-fg)] dark:text-white/60 uppercase tracking-wider" style={{ fontFamily: FM }}>
                  Or enter Ticket ID or Team Passkey
                </p>
                <p className="text-[11px] text-[color:var(--sk-muted)] dark:text-white/30" style={{ fontFamily: FB }}>
                  Enter Ticket ID or Team Passkey manually if camera cannot scan
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste Ticket ID or Team Passkey..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleProcessTicket(manualCode);
                  }}
                  className="flex-1 rounded-xl px-4 py-2.5 text-xs text-[color:var(--sk-fg)] dark:text-white bg-[color:var(--sk-raised)] dark:bg-white/5 border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] outline-none focus:border-[color:var(--sk-brand)]/50 transition-all"
                  style={{ fontFamily: FB }}
                />
                <button
                  onClick={() => handleProcessTicket(manualCode)}
                  disabled={loading || !manualCode.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[color:var(--sk-brand)] text-white text-xs font-semibold hover:bg-[color:var(--sk-brand-hover)] transition-all disabled:opacity-40 cursor-pointer flex-shrink-0"
                  style={{ fontFamily: FB }}
                >
                  Verify
                </button>
              </div>
              {scanError && (
                <div className="p-3.5 rounded-xl bg-[color:var(--sk-brand)]/10 border border-[color:var(--sk-brand)]/20 flex items-center justify-between gap-3 text-left">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <AlertTriangle size={16} className="text-[color:var(--sk-brand)] shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 dark:text-[#ff949d] font-medium leading-relaxed" style={{ fontFamily: FB }}>
                      {scanError}
                    </p>
                  </div>
                  <button
                    onClick={() => { setScanError(null); setManualCode(""); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[color:var(--sk-brand)] text-white text-xs font-semibold hover:bg-[color:var(--sk-brand-hover)] transition-all cursor-pointer flex-shrink-0"
                    style={{ fontFamily: FB }}
                  >
                    <RotateCcw size={12} />
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Inline Result Panel */
          <div className="space-y-5">
            {/* Verified Header Bar */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-emerald-700 dark:text-emerald-400" style={{ fontFamily: FM }}>
                      TICKET VERIFIED · {scanResult.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[color:var(--sk-fg)] dark:text-white mt-0.5" style={{ fontFamily: FB }}>
                    {scanResult.event.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setScanResult(null); setScanError(null); setManualCode(""); }}
                className="text-xs px-3.5 py-1.5 rounded-lg bg-[color:var(--sk-raised)] hover:bg-slate-300 text-[color:var(--sk-fg)] dark:bg-white/10 dark:hover:bg-white/20 dark:text-white transition-all cursor-pointer font-semibold border border-[color:var(--sk-line)] dark:border-transparent"
                style={{ fontFamily: FB }}
              >
                Scan Next Ticket
              </button>
            </div>

            {/* Scanned Attendee Profile Summary */}
            {scanResult.attendee && (
              <div className="p-5 rounded-xl bg-[color:var(--sk-raised)] dark:bg-white/[0.02] border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] space-y-3">
                <div className="flex items-center justify-between border-b border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] pb-2.5">
                  <span className="text-[11px] uppercase tracking-widest text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)] font-semibold" style={{ fontFamily: FM }}>
                    Scanned Attendee Details
                  </span>
                  {scanResult.team && (
                    <span className="text-xs text-[color:var(--sk-muted)] dark:text-white/70 font-mono" style={{ fontFamily: FB }}>
                      Team: <strong className="text-[color:var(--sk-fg)] dark:text-white">{scanResult.team.name}</strong> (Passkey: <span className="text-emerald-700 dark:text-emerald-400 font-bold">{scanResult.team.passkey}</span>)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FB }}>
                  <div>
                    <span className="text-[10px] uppercase text-[color:var(--sk-muted)] dark:text-[color:var(--sk-faint)] block mb-0.5" style={{ fontFamily: FM }}>Full Name</span>
                    <span className="text-[color:var(--sk-fg)] dark:text-white font-medium text-sm">{scanResult.attendee.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[color:var(--sk-muted)] dark:text-[color:var(--sk-faint)] block mb-0.5" style={{ fontFamily: FM }}>USN</span>
                    <span className="text-[color:var(--sk-fg)] dark:text-white font-mono">{scanResult.attendee.usn || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[color:var(--sk-muted)] dark:text-[color:var(--sk-faint)] block mb-0.5" style={{ fontFamily: FM }}>Email</span>
                    <span className="text-[color:var(--sk-fg)] dark:text-white font-mono text-[11px]">{scanResult.attendee.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[color:var(--sk-muted)] dark:text-[color:var(--sk-faint)] block mb-0.5" style={{ fontFamily: FM }}>Branch / Sem</span>
                    <span className="text-[color:var(--sk-fg)] dark:text-white">
                      {scanResult.attendee.branch || '—'}
                      {scanResult.attendee.sem ? `, Sem ${scanResult.attendee.sem}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Team Members List */}
            {scanResult.team && scanResult.team.members.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--sk-fg)] dark:text-[color:var(--sk-fg)]" style={{ fontFamily: FM }}>
                    Team Roster ({scanResult.team.members.length} members checked-in)
                  </h4>
                </div>
                <div className="overflow-x-auto rounded-xl border border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] bg-[color:var(--sk-surface)] dark:bg-white/[0.005]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[color:var(--sk-line)] dark:border-[color:var(--sk-line)] bg-[color:var(--sk-raised)] dark:bg-white/5 text-[color:var(--sk-fg)] dark:text-[color:var(--sk-muted)]" style={{ fontFamily: FM }}>
                        <th className="p-3">Member Name</th>
                        <th className="p-3">USN</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Branch</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-[color:var(--sk-fg)] dark:text-white/80" style={{ fontFamily: FB }}>
                      {scanResult.team.members.map((member: any) => (
                        <tr key={member.id} className="hover:bg-[color:var(--sk-raised)] dark:hover:bg-white/[0.02] transition-colors">
                          <td className="p-3 font-semibold text-[color:var(--sk-fg)] dark:text-white flex items-center gap-2">
                            {member.name}
                            {member.isLeader && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase tracking-wider" style={{ fontFamily: FM }}>Leader</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">{member.usn || '—'}</td>
                          <td className="p-3 text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">{member.email || '—'}</td>
                          <td className="p-3 text-[color:var(--sk-muted)] dark:text-[color:var(--sk-muted)]">{member.branch || '—'}</td>
                          <td className="p-3 text-right">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                              member.status?.toUpperCase() === 'CONFIRMED'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                            }`} style={{ fontFamily: FM }}>
                              {member.status || 'CONFIRMED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
