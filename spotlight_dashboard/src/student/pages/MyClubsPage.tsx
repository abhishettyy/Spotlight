import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ChevronRight, Users, WifiOff } from 'lucide-react';
import { fetchUserTickets } from '@student/api/registrations';
import { ClubModel } from '@student/types/club';
import { PageLoader } from '@student/components/ui/LoadingSpinner';
import { EmptyState } from '@student/components/ui/States';
import Paginated from '@student/components/ui/Paginated';

// Ported from registered_clubs_screen.dart: clubs the user has registered events with
export default function MyClubsPage() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<ClubModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tickets = await fetchUserTickets();
      const seen = new Set<string>();
      const result: ClubModel[] = [];
      for (const t of tickets) {
        const clubId = t.event?.clubId ?? t.event?.clubName;
        if (clubId && !seen.has(clubId)) {
          seen.add(clubId);
          result.push({ id: clubId, name: t.event?.clubName ?? 'Unknown Club', logoUrl: t.event?.clubLogoUrl });
        }
      }
      setClubs(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderBody = () => {
    if (isLoading) return <PageLoader />;
    if (error) {
      const m = error.toLowerCase();
      const isConnection = m.includes('connection') || m.includes('timeout') || m.includes('network');
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', padding: '48px 32px' }}>
          <WifiOff size={48} color="var(--subtext)" style={{ opacity: 0.6, marginBottom: 4 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Could not load clubs</h3>
          <p style={{ fontSize: 12, color: 'var(--subtext)' }}>
            {isConnection ? 'Please check your internet connection and try again.' : error}
          </p>
          <button onClick={load} className="btn-primary" style={{ marginTop: 16, padding: '8px 20px' }}>Retry</button>
        </div>
      );
    }
    if (clubs.length === 0) {
      return (
        <EmptyState svgSrc="/svg/empty_clubs.svg" title="No Clubs Yet" description="Register for events to see clubs here" />
      );
    }
    return (
      <Paginated items={clubs} pageSize={12}>{(pageClubs) => (
      <div className="stu-list stu-list--grid">
        {pageClubs.map((club) => (
          <ClubTile
            key={club.id}
            club={club}
            onClick={() => navigate(`/clubs/${encodeURIComponent(club.id)}`, { state: { name: club.name, logoUrl: club.logoUrl } })}
          />
        ))}
      </div>
      )}</Paginated>
    );
  };

  return (
    <div className="stu-page stu-page--list">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', padding: 4 }}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>My Clubs</h1>
      </div>
      <p style={{ fontSize: 13, color: 'var(--subtext)', margin: '8px 0 20px' }}>Clubs you've registered events with</p>
      {renderBody()}
    </div>
  );
}

function ClubTile({ club, onClick }: { club: ClubModel; onClick: () => void }) {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <span style={{
        width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: 'var(--raised)',
        border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {club.logoUrl && !logoFailed ? (
          <img src={club.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setLogoFailed(true)} />
        ) : (
          <Users size={22} color="var(--subtext)" />
        )}
      </span>
      <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{club.name}</span>
      <ChevronRight size={18} color="var(--subtext)" />
    </button>
  );
}
