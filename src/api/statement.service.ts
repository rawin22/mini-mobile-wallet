import { apiClient } from './client';
import { API_CONFIG } from './config';
import type { StatementResponse } from '../types/statement.types';

export const statementService = {
  async getStatement(
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<StatementResponse> {
    const response = await apiClient.get<StatementResponse>(
      API_CONFIG.ENDPOINTS.CUSTOMER.STATEMENT,
      { params: { accountId, strStartDate: startDate, strEndDate: endDate } },
    );
    return response.data;
  },
};
