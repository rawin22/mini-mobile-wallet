import { apiClient } from './client';
import { API_CONFIG } from './config';
import type { FxDealSearchResponse } from '../types/fx.types';

export const fxHistoryService = {
  async searchDeals(): Promise<FxDealSearchResponse> {
    const response = await apiClient.get<FxDealSearchResponse>(
      API_CONFIG.ENDPOINTS.FX.DEAL_SEARCH,
      {
        params: {
          PageIndex: 0,
          PageSize: 50,
          SortBy: 'BookedTime',
          SortDirection: 'Descending',
        },
      },
    );
    return response.data;
  },
};
