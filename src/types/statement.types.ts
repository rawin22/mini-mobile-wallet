export interface AccountInfo {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountCurrencyCode: string;
  accountCurrencyScale: number;
  beginningBalance: number;
  endingBalance: number;
}

export interface StatementEntry {
  transactionTime: string;
  transactionType: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
}

export interface StatementResponse {
  accountInfo: AccountInfo;
  entries: StatementEntry[];
}
