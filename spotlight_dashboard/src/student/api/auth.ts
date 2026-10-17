// Ported from spotlight_flutter/lib/core/api_service.dart — auth methods
// POST /auth/signup, /auth/login, /auth/google-student, /auth/verify-password, /auth/change-password

import apiClient, { formatApiError } from './client';
import { userFromJson, UserModel } from '@student/types/user';

export interface SignupParams {
  email: string;
  password: string;
  name: string;
  usn?: string;
  branch?: string;
  phone?: string;
  year?: string;
  sem?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface AuthResult {
  user: UserModel;
  token: string;
  userId: string;
}

export async function signup(params: SignupParams): Promise<AuthResult> {
  try {
    const res = await apiClient.post('/auth/signup', {
      email: params.email,
      password: params.password,
      name: params.name,
      usn: params.usn,
      branch: params.branch,
      phone: params.phone,
      year: params.year,
      sem: params.sem,
    });
    const data = res.data;
    const user = userFromJson(data.profile);
    const token = data.token as string;
    return { user, token, userId: user.id };
  } catch (e) {
    throw new Error(formatApiError(e, 'Signup failed. Please check your connection.'));
  }
}

export async function login(params: LoginParams): Promise<AuthResult> {
  try {
    const res = await apiClient.post('/auth/login', {
      email: params.email,
      password: params.password,
    });
    const data = res.data;
    const user = userFromJson(data.profile);
    const token = data.token as string;
    return { user, token, userId: user.id };
  } catch (e) {
    throw new Error(formatApiError(e, 'Login failed. Please check your connection.'));
  }
}

/** Signs in an existing student account with a Google access token (no account creation). */
export async function googleLogin(accessToken: string): Promise<AuthResult> {
  try {
    const res = await apiClient.post('/auth/google-student', { access_token: accessToken });
    const data = res.data;
    const user = userFromJson(data.profile);
    const token = data.token as string;
    return { user, token, userId: user.id };
  } catch (e) {
    throw new Error(formatApiError(e, 'Google sign-in failed. Please check your connection.'));
  }
}

export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  try {
    await apiClient.post('/auth/verify-password', { userId, password });
    return true;
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to verify password.'));
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  try {
    await apiClient.post('/auth/change-password', { oldPassword, newPassword });
    return true;
  } catch (e) {
    throw new Error(formatApiError(e, 'Failed to update password.'));
  }
}
