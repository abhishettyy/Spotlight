
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


export async function requestPasswordReset(email: string): Promise<string> {
  try {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return (res.data?.message as string) ?? 'Code sent.';
  } catch (e) {
    throw new Error(formatApiError(e, "Couldn't send the code. Please try again."));
  }
}

export async function resetPassword(params: { email: string; code: string; newPassword: string }): Promise<string> {
  try {
    const res = await apiClient.post('/auth/reset-password', params);
    return (res.data?.message as string) ?? 'Password reset.';
  } catch (e) {
    throw new Error(formatApiError(e, "Couldn't reset the password. Please try again."));
  }
}

export function newPasswordProblem(pass: string): string | null {
  const missing: string[] = [];
  if (pass.length < 8) missing.push('at least 8 characters');
  if (!/[A-Z]/.test(pass)) missing.push('at least one uppercase letter');
  if (!/[0-9]/.test(pass)) missing.push('at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\|,.<>\/?]/.test(pass)) missing.push('at least one special character');
  return missing.length ? `Password must contain ${missing.join(', ')}.` : null;
}
