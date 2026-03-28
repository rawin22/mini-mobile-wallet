import { apiClient } from './client';
import { API_CONFIG } from './config';

// The API returns camelCase from Search — normalise to a consistent shape
export interface VerifiedLinkProfile {
  verifiedLinkId: string;
  verifiedLinkReference: string;    // e.g. "VL10284"
  verifiedLinkName: string;         // recipient's display name
  verifiedLinkStatusTypeName?: string;
  verifiedLinkStatusTypeId?: number;
  customerId?: string;
  isPrimary?: boolean;
  // URL is NOT returned by Search — construct from reference
  verifiedLinkUrl?: string;
}

/** Build the public payment URL for a VLink.
 *  The URL uses the GUID (verifiedLinkId), not the reference.
 *  Override base via EXPO_PUBLIC_VLINK_BASE_URL (no trailing slash). */
const VLINK_BASE_URL =
  (process.env.EXPO_PUBLIC_VLINK_BASE_URL as string | undefined)?.replace(/\/$/, '')
  ?? 'https://fx.worldkyc.com/verify';

export const buildVlinkUrl = (verifiedLinkId: string): string =>
  `${VLINK_BASE_URL}/${verifiedLinkId}`;

interface RawRecord {
  verifiedLinkId?: string;
  VerifiedLinkId?: string;
  verifiedLinkReference?: string;
  VerifiedLinkReference?: string;
  verifiedLinkName?: string;
  VerifiedLinkName?: string;
  verifiedLinkStatusTypeName?: string;
  VerifiedLinkStatusTypeName?: string;
  verifiedLinkStatusTypeId?: number;
  VerifiedLinkStatusTypeId?: number;
  customerId?: string;
  isPrimary?: boolean;
  verifiedLinkUrl?: string;
  VerifiedLinkUrl?: string;
  verifiedLinkShortUrl?: string;
  VerifiedLinkShortUrl?: string;
}

const normalise = (r: RawRecord): VerifiedLinkProfile => ({
  verifiedLinkId: r.verifiedLinkId ?? r.VerifiedLinkId ?? '',
  verifiedLinkReference: r.verifiedLinkReference ?? r.VerifiedLinkReference ?? '',
  verifiedLinkName: r.verifiedLinkName ?? r.VerifiedLinkName ?? '',
  verifiedLinkStatusTypeName: r.verifiedLinkStatusTypeName ?? r.VerifiedLinkStatusTypeName,
  verifiedLinkStatusTypeId: r.verifiedLinkStatusTypeId ?? r.VerifiedLinkStatusTypeId,
  customerId: r.customerId,
  isPrimary: r.isPrimary,
  // Prefer explicit URL from API; fall back to constructing it
  verifiedLinkUrl: r.verifiedLinkUrl ?? r.VerifiedLinkUrl
    ?? r.verifiedLinkShortUrl ?? r.VerifiedLinkShortUrl
    ?? undefined,
});

const extractLinks = (data: unknown): VerifiedLinkProfile[] => {
  const d = data as Record<string, unknown>;
  // Response shape: { records: { verifiedLinks: [...] } }
  const records = (d.records ?? d.Records) as Record<string, unknown> | undefined;
  const raw = (records?.verifiedLinks ?? records?.VerifiedLinks
    ?? d.verifiedLinks ?? d.VerifiedLinks) as RawRecord[] | undefined;
  return (raw ?? []).map(normalise);
};

const SEARCH_BASE_PARAMS = {
  PageIndex: 0,
  PageSize: 10,
  VerifiedLinkTypeId: 3,
  SortBy: 'CreatedTime',
  SortDirection: 'Descending',
};

export const verifiedLinkService = {
  /** Search for a recipient by their StealthID (VL reference) or name. */
  async search(query: string): Promise<VerifiedLinkProfile | null> {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.VERIFIED_LINK.SEARCH, {
      params: { ...SEARCH_BASE_PARAMS, query },
    });
    return extractLinks(response.data)[0] ?? null;
  },

  /** Fetch all of the current user's own verified links (for Receive screen + Profile). */
  async getMyLinks(organizationId: string): Promise<VerifiedLinkProfile[]> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.VERIFIED_LINK.SEARCH, {
        params: { ...SEARCH_BASE_PARAMS, OrganizationId: organizationId },
      });
      return extractLinks(response.data);
    } catch {
      return [];
    }
  },
};
