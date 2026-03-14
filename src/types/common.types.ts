export interface ApiProblem {
  code: string;
  message: string;
  severity: string;
}

export interface ApiResponse<T> {
  data: T;
  problems: ApiProblem[] | null;
}
