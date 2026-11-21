
import apiClient, { formatApiError } from './client';
import { userFromJson, UserModel } from '@student/types/user';

export async function getProfile(userId: string): Promise<UserModel | null> {
  try {
    const res = await apiClient.get(`/profiles/${userId}`);
    return userFromJson(res.data.profile as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function fetchProfileStats(userId: string): Promise<{ eventsCount: number; clubsCount: number }> {
  try {
    const res = await apiClient.get(`/profiles/${userId}/stats`);
    return {
      eventsCount: (res.data.eventsCount ?? 0) as number,
      clubsCount: (res.data.clubsCount ?? 0) as number,
    };
  } catch {
    return { eventsCount: 0, clubsCount: 0 };
  }
}

export async function updateProfile(params: {
  usn: string;
  branch: string;
  phone: string;
}): Promise<UserModel> {
  try {
    const res = await apiClient.put('/profiles/update', params);
    return userFromJson(res.data.profile as Record<string, unknown>);
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to update profile.'));
  }
}

export async function editProfile(params: {
  userId: string;
  name?: string;
  usn?: string;
  branch?: string;
  phone?: string;
  year?: string;
  sem?: string;
}): Promise<UserModel> {
  try {
    const res = await apiClient.put('/profiles/edit', {
      userId: params.userId,
      full_name: params.name,
      usn: params.usn,
      branch: params.branch,
      phone: params.phone,
      year: params.year,
      sem: params.sem,
    });
    return userFromJson(res.data.profile as Record<string, unknown>);
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to update profile.'));
  }
}
