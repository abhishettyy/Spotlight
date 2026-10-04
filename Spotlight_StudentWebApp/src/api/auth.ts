// Ported from spotlight_flutter/lib/core/api_service.dart — auth methods
// POST /auth/signup, /auth/login, /auth/verify-password, /auth/change-password

import apiClient, { formatApiError } from './client';
import { userFromJson, UserModel } from '@/types/user';
import { DEMO_USER } from '@/utils/demoData';

export const DUMMY_CREDENTIALS = {
  email: 'demo@spotlight.app',
  password: 'demo123',
};

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

function isDemoCredentials(email: string, password?: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  return (
    cleanEmail === 'demo@spotlight.app' ||
    cleanEmail === 'admin@spotlight.app' ||
    cleanEmail === 'test@spotlight.app' ||
    cleanEmail.startsWith('demo') ||
    password === 'demo123' ||
    password === 'password123'
  );
}

export async function signup(params: SignupParams): Promise<AuthResult> {
  try {
    const res = await apiClient.post('/auth/signup', {
      email: params.email,
      password: params.password,
      name: params.name,
      usn: params.usn || undefined,
      branch: params.branch || undefined,
      phone: params.phone || undefined,
      year: params.year || undefined,
      sem: params.sem || undefined,
    });
    const data = res.data;
    const user = userFromJson(data.profile);
    const token = data.token as string;
    return { user, token, userId: user.id };
  } catch (e) {
    throw new Error(formatApiError(e, 'Signup failed. Please try again.'));
  }
}

export async function login(params: LoginParams): Promise<AuthResult> {
  // Optional bypass for demo preview if explicitly entered
  if (params.email.trim().toLowerCase() === 'demo@spotlight.app' && params.password === 'demo123') {
    return {
      user: DEMO_USER,
      token: 'demo_token_session',
      userId: DEMO_USER.id,
    };
  }

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
    throw new Error(formatApiError(e, 'Login failed. Please check your email and password.'));
  }
}

export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  if (userId === DEMO_USER.id) {
    return true;
  }
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
