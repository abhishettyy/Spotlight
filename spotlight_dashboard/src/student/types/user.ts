// Ported from spotlight_flutter/lib/core/user_provider.dart

export interface UserModel {
  id: string;
  name: string;
  email: string;
  usn?: string | null;
  branch?: string | null;
  phone?: string | null;
  year?: string | null;
  sem?: string | null;
  clubId?: string | null;
  hasPassword?: boolean;
}

export function isProfileIncomplete(user: UserModel): boolean {
  if (user.clubId) return false;
  return !user.usn || !user.branch || !user.phone;
}

export function userFromJson(json: Record<string, unknown>): UserModel {
  return {
    id: (json['id'] as string) ?? '',
    name: (json['fullName'] ?? json['full_name'] ?? json['name'] ?? '') as string,
    email: (json['email'] ?? '') as string,
    usn: (json['usn'] as string | null) ?? null,
    branch: (json['branch'] as string | null) ?? null,
    phone: (json['phone'] as string | null) ?? null,
    year: json['year'] != null ? String(json['year']) : null,
    sem: json['sem'] != null ? String(json['sem']) : null,
    clubId: (json['clubId'] ?? json['club_id'] ?? null) as string | null,
    hasPassword: (json['hasPassword'] as boolean | undefined) ?? false,
  };
}
