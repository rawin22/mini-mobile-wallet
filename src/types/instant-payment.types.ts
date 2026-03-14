export interface InstantPaymentCreateRequest {
  fromCustomer: string;
  toCustomer: string;
  paymentTypeId: number;
  amount: number;
  currencyCode: string;
  valueDate: string;
  reasonForPayment: string;
  externalReference: string;
  memo: string;
}

export interface InstantPaymentDraft {
  paymentId: string;
  paymentReference: string;
  timestamp: string;
}

export interface InstantPaymentCreateResponse {
  payment: InstantPaymentDraft;
  problems: null | string;
}

export interface InstantPaymentPostRequest {
  instantPaymentId: string;
  timestamp: string;
}

export interface InstantPaymentPostResponse {
  payment: null;
  problems: null | string;
}
