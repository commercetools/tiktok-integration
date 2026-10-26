/** An error whose message is safe to return to the caller. */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly issues?: string[];

  constructor(statusCode: number, message: string, issues?: string[]) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    if (issues) {
      this.issues = issues;
    }
  }
}
