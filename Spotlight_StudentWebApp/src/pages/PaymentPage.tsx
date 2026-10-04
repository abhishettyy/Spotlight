import { useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { useEventsStore } from '@/store/eventsStore';
import { submitPayment } from '@/api/registrations';
import { fileToBase64 } from '@/utils/imageUtils';
import { toast } from 'sonner';

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const registrationId = searchParams.get('registrationId') ?? '';
  const navigate = useNavigate();
  const { events } = useEventsStore();
  const event = events.find((e) => e.id === id);

  const [transactionId, setTransactionId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSubmit = async () => {
    if (!transactionId.trim() && !selectedFile) {
      toast.error('Please enter a transaction ID or upload a payment screenshot.');
      return;
    }
    if (!registrationId) {
      toast.error('Invalid registration. Please go back and try again.');
      return;
    }

    setIsLoading(true);
    try {
      let base64: string | undefined;
      if (selectedFile) {
        base64 = await fileToBase64(selectedFile);
      }
      await submitPayment({ registrationId, base64Image: base64, transactionId: transactionId.trim() });
      setSuccess(true);
      toast.success('Payment submitted! Awaiting approval.');
      setTimeout(() => navigate('/tickets', { replace: true }), 1500);
    } catch (e) {
      toast.error(String(e).replace('Error: ', ''));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, padding: 24 }}>
        <CheckCircle size={64} color="#16a34a" />
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Payment Submitted!</h2>
        <p style={{ color: 'var(--subtext)', textAlign: 'center' }}>Your payment is awaiting approval. You'll be notified once confirmed.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: 24 }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-crimson)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Complete Payment</h1>
      {event && <p style={{ color: 'var(--subtext)', fontSize: 14, marginBottom: 24 }}>{event.title} · ₹{event.price}</p>}

      {/* Payment QR */}
      {event?.qrUrl && (
        <div className="spotlight-card" style={{ padding: 24, textAlign: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--subtext)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Scan to Pay
          </p>
          <img
            src={event.qrUrl}
            alt="Payment QR"
            style={{ width: 200, height: 200, objectFit: 'contain', margin: '0 auto', display: 'block', borderRadius: 12 }}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          {event.upiId && (
            <p style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
              UPI: {event.upiId}
            </p>
          )}
          {event.price > 0 && (
            <p style={{ marginTop: 4, fontSize: 22, fontWeight: 900, color: 'var(--color-crimson)' }}>
              ₹{event.price}
            </p>
          )}
        </div>
      )}

      <div className="spotlight-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Transaction ID */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Transaction / UTR ID
          </label>
          <input
            type="text"
            placeholder="Enter transaction ID"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="input-field"
          />
          <p style={{ fontSize: 12, color: 'var(--subtext)', marginTop: 4 }}>
            Enter the UPI transaction ID or reference number
          </p>
        </div>

        {/* Screenshot upload */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Payment Screenshot
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileChange(file);
            }}
          />
          {preview ? (
            <div style={{ position: 'relative' }}>
              <img
                src={preview}
                alt="Payment proof"
                style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)' }}
              />
              <button
                onClick={() => { setSelectedFile(null); setPreview(null); }}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%',
                padding: '28px 0',
                borderRadius: 12,
                border: '2px dashed var(--border)',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                color: 'var(--subtext)',
                fontFamily: 'var(--font-sans)',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-crimson)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <Upload size={28} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Upload Screenshot</span>
              <span style={{ fontSize: 12 }}>Click to select an image</span>
            </button>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {isLoading ? (
            <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Submitting…</>
          ) : 'Submit Payment'}
        </button>
      </div>
    </div>
  );
}
