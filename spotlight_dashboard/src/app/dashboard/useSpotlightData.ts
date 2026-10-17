import { useState, useEffect } from "react";
import { syncProfile, fetchClubs, fetchAllRegistrationsForEvents, fetchClubDashboardStats } from "../api";
import { ClubEvent, Registration } from "./shared";

export function useSpotlightData() {
  const localToken = localStorage.getItem("spotlight_token");
  const localProfileRaw = localStorage.getItem("spotlight_profile");
  const localProfile = localProfileRaw ? JSON.parse(localProfileRaw) : null;
  const isLocalSignedIn = !!localToken && !!localProfile;

  const isSignedIn = isLocalSignedIn;
  const userId = localProfile?.id;

  const getToken = async () => localToken;

  const [clubs, setClubs]                   = useState<any[]>([]);
  const [profile, setProfile]               = useState<any>(localProfile);
  const user = profile;
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
      const token = await getToken();
      if (!token) return;

      let freshProfile = profile;
      if (!isLocalSignedIn) {
        const email = user?.primaryEmailAddress?.emailAddress ?? '';
        const name  = user?.fullName ?? user?.firstName ?? 'Club Admin';
        const syncResult = await syncProfile(userId!, email, name, token);
        freshProfile = syncResult.profile;
        setProfile(freshProfile);
      }

      const clubsData = await fetchClubs();
      setClubs(clubsData.clubs ?? []);

      const clubId = freshProfile?.clubId;
      if (clubId) {
        await loadDashboardStats(clubId, token);
      }
    } catch (e) {
    }
  };

  const refreshProfile = async (): Promise<any> => {
    try {
      if (isLocalSignedIn) return localProfile;
      const token = await getToken();
      if (!token || !userId) return profile;
      const email = user?.primaryEmailAddress?.emailAddress ?? '';
      const name  = user?.fullName ?? user?.firstName ?? 'Club Admin';
      const syncResult = await syncProfile(userId, email, name, token);
      const freshProfile = syncResult.profile;
      setProfile(freshProfile);
      return freshProfile;
    } catch (e) {
      return profile;
    }
  };

  useEffect(() => {
    if (!isSignedIn || !userId || (!isLocalSignedIn && !user)) return;

    async function load() {
      try {
        const token = await getToken();
        if (!token) return;

        if (isLocalSignedIn) {
          setProfile(localProfile);
          const clubsData = await fetchClubs();
          setClubs(clubsData.clubs ?? []);

          if (localProfile?.clubId) {
            await loadDashboardStats(localProfile.clubId, token);
          }
          return;
        }

        const email = user?.primaryEmailAddress?.emailAddress ?? '';
        const name  = user?.fullName ?? user?.firstName ?? 'Club Admin';

        const [syncResult, clubsData] = await Promise.all([
          syncProfile(userId!, email, name, token),
          fetchClubs()
        ]);

        let freshProfile = syncResult.profile;
        setProfile(freshProfile);
        setClubs(clubsData.clubs ?? []);

        if (freshProfile?.clubId) {
          await loadDashboardStats(freshProfile.clubId, token);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }

    load();

    const handleClubCreated = async () => {
      const freshProf = await refreshProfile();
      if (freshProf?.clubId) {
        const token = await getToken();
        if (token) await loadDashboardStats(freshProf.clubId, token);
      }
    };
    window.addEventListener('spotlight:club_created', handleClubCreated);

    return () => {
      window.removeEventListener('spotlight:club_created', handleClubCreated);
    };
  }, [isSignedIn, userId, user]);

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
