import { apiClient } from './client';
import { API_CONFIG } from './config';
import type { BalanceResponse } from '../types/balance.types';

export const balanceService = {
  async getBalances(customerId: string): Promise<BalanceResponse> {
    const response = await apiClient.get<BalanceResponse>(
      `${API_CONFIG.ENDPOINTS.CUSTOMER.BALANCES}/${customerId}`,
    );
    return response.data;
  },
};
