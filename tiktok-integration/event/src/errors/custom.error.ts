type ErrorItem = {
  statusCode: number | string;
  message: string;
  referencedBy?: string;
};

class CustomError extends Error {
  statusCode: number | string;
  message: string;
  retryable?: boolean;
  errors?: ErrorItem[];

  constructor(
    statusCode: number | string,
    message: string,
    errors?: ErrorItem[],
    retryable?: boolean
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.retryable = retryable;
    if (errors) {
      this.errors = errors;
    }
  }
}

export default CustomError;
