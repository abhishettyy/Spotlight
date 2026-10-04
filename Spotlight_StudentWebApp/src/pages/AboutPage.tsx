export default function AboutPage() {
  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 20, letterSpacing: '-0.3px' }}>
        About Spotlight
      </h1>

      <div className="spotlight-card" style={{ padding: 28, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--color-crimson)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 24, fontWeight: 900 }}>S</span>
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Spotlight</h2>
            <p style={{ fontSize: 13, color: 'var(--subtext)' }}>Your campus event platform</p>
          </div>
        </div>
        <p style={{ fontSize: 14, color: 'var(--subtext)', lineHeight: 1.8 }}>
          Spotlight is a platform built to connect students with the events and clubs on their campus.
          Discover upcoming events, register with ease, team up with friends, and keep track of all your
          registrations in one place.
        </p>
      </div>

      <div className="spotlight-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Features</h3>
        {[
          '🎪 Browse and discover campus events',
          '🎫 Register for solo or team events',
          '💳 Submit payment proofs seamlessly',
          '🏛️ Explore active clubs on campus',
          '🔔 Get notified about registrations and events',
          '📱 Access from any device, anywhere',
        ].map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 14, color: 'var(--subtext)', lineHeight: 1.5 }}>{f}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
