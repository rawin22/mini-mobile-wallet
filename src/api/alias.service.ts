import { apiClient } from './client';
import { API_CONFIG } from './config';

export interface AccountAlias {
  accountAlias: string;
  accountAliasTypeId: number;
  accountAliasTypeName: string;
  isDefault: boolean;
}

interface AliasListResponse {
  aliases?: AccountAlias[];
  problems?: unknown;
}

export const aliasService = {
  /** Fetch account aliases for a customer. Returns the list sorted with the default alias first. */
  async getAliases(customerId: string): Promise<AccountAlias[]> {
    const response = await apiClient.get<AliasListResponse>(
      `${API_CONFIG.ENDPOINTS.CUSTOMER.ALIAS_LIST}/${customerId}`,
    );
    const list = response.data.aliases ?? [];
    return list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  },

  /** Returns the default alias string for a customer, or null if none found. */
  async getDefaultAlias(customerId: string): Promise<string | null> {
    try {
      const list = await aliasService.getAliases(customerId);
      return list[0]?.accountAlias ?? null;
    } catch {
      return null;
    }
  },
};
