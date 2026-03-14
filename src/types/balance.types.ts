export interface CustomerBalanceData {
  accountId: string;
  accountNumber: string;
  currencyCode: string;
  balance: number;
  balanceAvailable: number;
  activeHoldsTotal: number;
}

export interface BalanceResponse {
  balances: CustomerBalanceData[];
}
