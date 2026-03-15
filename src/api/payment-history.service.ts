import { apiClient } from './client';
import { API_CONFIG } from './config';
import type { PaymentSearchResponse } from '../types/payment.types';

interface SearchParams {
  pageIndex?: number;
  pageSize?: number;
}

export const paymentHistoryService = {
  async searchPayments(params: SearchParams = {}): Promise<PaymentSearchResponse> {
    const response = await apiClient.get<PaymentSearchResponse>(
      API_CONFIG.ENDPOINTS.INSTANT_PAYMENT.SEARCH,
      {
        params: {
          PageIndex: params.pageIndex ?? 0,
          PageSize: params.pageSize ?? 25,
          SortBy: 'CreatedTime',
          SortDirection: 'Descending',
        },
      },
    );
    console.log('[Payment History] Raw response:', JSON.stringify(response.data).slice(0, 800));
    return response.data;
  },
};
