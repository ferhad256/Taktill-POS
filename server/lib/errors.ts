/** Mirrors the PRD error-code reference (§5.6). */
export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, status = 400, details?: unknown) {
    super(code);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
