export interface CustomerBalanceData {
  accountId: string;
  accountNumber: string;
  currencyCode: string;
  balance: number;
  balanceText: string;
  balanceTextWithCurrencyCode: string;
  activeHoldsTotal: number;
  activeHoldsTotalText: string;
  activeHoldsTotalTextWithCurrencyCode: string;
  balanceAvailable: number;
  balanceAvailableText: string;
  balanceAvailableTextWithCurrencyCode: string;
  baseCurrencyCode: string;
  balanceAvailableBase: number;
  balanceAvailableBaseText: string;
  balanceAvailableBaseTextWithCurrencyCode: string;
}

export interface BalanceResponse {
  balances: CustomerBalanceData[];
}
