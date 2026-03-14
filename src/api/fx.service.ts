import { apiClient } from './client';
import { API_CONFIG } from './config';
import type {
  FxCurrencyListResponse,
  FxQuoteRequest,
  FxQuoteResponse,
  FxBookResponse,
} from '../types/fx.types';

export const fxService = {
  async getBuyCurrencies(): Promise<FxCurrencyListResponse> {
    const response = await apiClient.get<FxCurrencyListResponse>(
      API_CONFIG.ENDPOINTS.FX.CURRENCY_LIST_BUY,
    );
    return response.data;
  },

  async getSellCurrencies(): Promise<FxCurrencyListResponse> {
    const response = await apiClient.get<FxCurrencyListResponse>(
      API_CONFIG.ENDPOINTS.FX.CURRENCY_LIST_SELL,
    );
    return response.data;
  },

  async getQuote(request: FxQuoteRequest): Promise<FxQuoteResponse> {
    const response = await apiClient.post<FxQuoteResponse>(
      API_CONFIG.ENDPOINTS.FX.QUOTE,
      request,
    );
    return response.data;
  },

  async bookDeal(quoteId: string): Promise<FxBookResponse> {
    const response = await apiClient.patch<FxBookResponse>(
      `${API_CONFIG.ENDPOINTS.FX.QUOTE}/${quoteId}/BookAndInstantDeposit`,
    );
    return response.data;
  },
};
