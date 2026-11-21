import { useState, useEffect } from "react";
import { fetchClubs, fetchAllRegistrationsForEvents, fetchClubDashboardStats } from "../api";
import { ClubEvent, Registration } from "./shared";

function readSession(): { token: string | null; profile: any } {
  const token = localStorage.getItem("spotlight_token");
  try {
    const raw = localStorage.getItem("spotlight_profile");
    return { token, profile: raw ? JSON.parse(raw) : null };
  } catch {
    return { token, profile: null };
  }
}

export function useSpotlightData() {
  const session = readSession();
  const localToken = session.token;
  const userId = session.profile?.id;

  const getToken = async () => localToken;

  const [clubs, setClubs]                   = useState<any[]>([]);
  const [profile, setProfile]               = useState<any>(session.profile);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading]               = useState(true);

  const [totalEvents, setTotalEvents]             = useState(0);
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [pendingCount, setPendingCount]           = useState(0);
  const [recentActivity, setRecentActivity]       = useState<Registration[]>([]);
  const [clubEvents, setClubEvents]               = useState<ClubEvent[]>([]);

  const loadDashboardStats = async (clubId: string, token: string) => {
    try {
      const stats = await fetchClubDashboardStats(clubId, token);
      setTotalEvents(stats.totalEvents);
      setTotalRegistrations(stats.totalRegistrations);
      setPendingCount(stats.pendingCount);
      setRecentActivity(stats.recentActivity);
      setClubEvents(stats.clubEvents);

      fetchAllRegistrationsForEvents(
        clubId,
        stats.clubEvents.map((e: any) => ({ id: e.id, title: e.title })),
        token
      ).then(regs => {
        setAllRegistrations(regs);
      }).catch(() => {});
    } catch (e) {
    }
  };

  const refreshEvents = async () => {
    try {
      if (!localToken) return;
      const clubsData = await fetchClubs();
      setClubs(clubsData.clubs ?? []);
      if (profile?.clubId) {
        await loadDashboardStats(profile.clubId, localToken);
      }
    } catch (e) {
    }
  };

  const refreshProfile = async (): Promise<any> => readSession().profile ?? profile;

  useEffect(() => {
    if (!localToken || !userId) return;

    async function load() {
      try {
        const current = readSession().profile;
        setProfile(current);
        const clubsData = await fetchClubs();
        setClubs(clubsData.clubs ?? []);

        if (current?.clubId) {
          await loadDashboardStats(current.clubId, localToken!);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }

    load();

    const handleClubCreated = async () => {
      const freshProf = await refreshProfile();
      if (freshProf?.clubId && localToken) await loadDashboardStats(freshProf.clubId, localToken);
    };
    window.addEventListener('spotlight:club_created', handleClubCreated);

    return () => {
      window.removeEventListener('spotlight:club_created', handleClubCreated);
    };
  }, [localToken, userId]);

  return {
    clubEvents,
    clubs,
    profile,
    loading,
    allRegistrations,
    totalEvents,
    totalRegistrations,
    pendingCount,
    recentActivity,
    refreshEvents,
    refreshProfile,
    setAllRegistrations,
    getToken,
  };
}
