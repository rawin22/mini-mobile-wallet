import { apiClient } from './client';
import { API_CONFIG } from './config';
import type { FxDealSearchResponse } from '../types/fx.types';

interface SearchParams {
  pageIndex?: number;
  pageSize?: number;
}

export const fxHistoryService = {
  async searchDeals(params: SearchParams = {}): Promise<FxDealSearchResponse> {
    const response = await apiClient.get<FxDealSearchResponse>(
      API_CONFIG.ENDPOINTS.FX.DEAL_SEARCH,
      {
        params: {
          PageIndex: params.pageIndex ?? 0,
          PageSize: params.pageSize ?? 25,
          SortBy: 'BookedTime',
          SortDirection: 'Descending',
        },
      },
    );
    console.log('[FX History] Loaded', (response.data.fxDeals ?? []).length, 'of', response.data.totalRecords ?? 0, 'deals');
    return response.data;
  },
};
