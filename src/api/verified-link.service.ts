import { apiClient } from './client';
import { API_CONFIG } from './config';

export interface VerifiedLinkProfile {
  VerifiedLinkId: string;
  VerifiedLinkReference: string;   // e.g. "VL10207"
  VerifiedLinkName: string;        // recipient's display name
  VerifiedLinkUrl: string;         // payment link URL
  VerifiedLinkShortUrl: string;
  OrganizationName?: string;
  TrustScore?: number;
  WKYCLevel?: number;
  Status?: string;                 // e.g. "Verified"
  IsVerified?: boolean;
  AccountType?: string;            // e.g. "Individual"
}

interface SearchResponse {
  verifiedLinks?: VerifiedLinkProfile[];
  VerifiedLinks?: VerifiedLinkProfile[];
  problems?: any;
}

interface GetResponse {
  verifiedLink?: VerifiedLinkProfile;
  VerifiedLink?: VerifiedLinkProfile;
  problems?: any;
}

export const verifiedLinkService = {
  /** Search for a recipient by their StealthID (VL reference) or username. */
  async search(query: string): Promise<VerifiedLinkProfile | null> {
    const response = await apiClient.get<SearchResponse>(API_CONFIG.ENDPOINTS.VERIFIED_LINK.SEARCH, {
      params: { query },
    });
    const links = response.data.verifiedLinks ?? response.data.VerifiedLinks ?? [];
    return links[0] ?? null;
  },

  /** Fetch the current user's own verified link (for QR display on the Receive screen). */
  async getMyLink(customerId: string): Promise<VerifiedLinkProfile | null> {
    const response = await apiClient.get<GetResponse>(API_CONFIG.ENDPOINTS.VERIFIED_LINK.BASE, {
      params: { customerId, isPrimary: true },
    });
    return response.data.verifiedLink ?? response.data.VerifiedLink ?? null;
  },
};
