import { apiClient } from './client';
import { API_CONFIG } from './config';
import type { PaymentSearchResponse } from '../types/payment.types';

export const paymentHistoryService = {
  async searchPayments(): Promise<PaymentSearchResponse> {
    const response = await apiClient.get<PaymentSearchResponse>(
      API_CONFIG.ENDPOINTS.INSTANT_PAYMENT.SEARCH,
      {
        params: {
          PageIndex: 0,
          PageSize: 25,
          SortBy: 'CreatedTime',
          SortDirection: 'Descending',
        },
      },
    );
    return response.data;
  },
};
