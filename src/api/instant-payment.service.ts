import { apiClient } from './client';
import { API_CONFIG } from './config';
import type {
  InstantPaymentCreateRequest,
  InstantPaymentCreateResponse,
  InstantPaymentPostRequest,
  InstantPaymentPostResponse,
} from '../types/instant-payment.types';

export const instantPaymentService = {
  async createPayment(request: InstantPaymentCreateRequest): Promise<InstantPaymentCreateResponse> {
    const response = await apiClient.post<InstantPaymentCreateResponse>(
      API_CONFIG.ENDPOINTS.INSTANT_PAYMENT.CREATE,
      request,
    );
    return response.data;
  },

  async confirmPayment(request: InstantPaymentPostRequest): Promise<InstantPaymentPostResponse> {
    const response = await apiClient.patch<InstantPaymentPostResponse>(
      API_CONFIG.ENDPOINTS.INSTANT_PAYMENT.POST,
      request,
    );
    return response.data;
  },
};
