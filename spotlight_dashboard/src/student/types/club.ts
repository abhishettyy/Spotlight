// Ported from spotlight_flutter/lib/models/models.dart

export interface ClubModel {
  id: string;
  name: string;
  logoUrl?: string | null;
}

export function clubFromJson(json: Record<string, unknown>): ClubModel {
  return {
    id: json['id'] as string,
    name: (json['name'] ?? 'No Name') as string,
    logoUrl: (json['logoUrl'] ?? json['logo_url'] ?? null) as string | null,
  };
}
