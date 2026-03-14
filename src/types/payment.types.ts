export interface PaymentSearchRecord {
  paymentId: string;
  paymentReference: string;
  status: string;
  fromCustomerAlias: string;
  toCustomerAlias: string;
  fromCustomerName?: string;
  toCustomerName?: string;
  paymentTypeName?: string;
  amount: number;
  amountTextWithCurrencyCode?: string;
  currencyCode: string;
  valueDate?: string;
  createdTime: string;
  postedTime?: string;
  externalReference?: string;
  memo?: string;
}

export interface PaymentSearchResponse {
  records: {
    payments: PaymentSearchRecord[];
    recordCount: number;
    totalRecords: number;
  };
  problems: null | string;
}
