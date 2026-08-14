// src/lib/errors.ts
//
// Typed error classes thrown by services/guards and mapped to HTTP responses
// by `handleApiError` (src/utils/api-response.ts).

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CustomError extends Error {
  readonly status: number;
  readonly severity: ErrorSeverity;
  readonly code?: string;

  constructor(
    status: number,
    message: string,
    options: { severity?: ErrorSeverity; code?: string } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.severity = options.severity ?? ErrorSeverity.MEDIUM;
    this.code = options.code;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class BadRequestError extends CustomError {
  constructor(message = 'Bad request', code?: string) {
    super(400, message, { severity: ErrorSeverity.LOW, code });
  }
}

export class ValidationError extends CustomError {
  constructor(message = 'Validation failed', code?: string) {
    super(400, message, { severity: ErrorSeverity.LOW, code });
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message = 'Unauthorized access', code?: string) {
    super(401, message, { severity: ErrorSeverity.MEDIUM, code });
  }
}

export class ForbiddenError extends CustomError {
  constructor(
    message = 'You are not allowed to perform this action',
    code?: string,
  ) {
    super(403, message, { severity: ErrorSeverity.MEDIUM, code });
  }
}

export class NotFoundError extends CustomError {
  constructor(message = 'Resource not found', code?: string) {
    super(404, message, { severity: ErrorSeverity.LOW, code });
  }
}

export class ConflictError extends CustomError {
  constructor(message = 'Conflict detected', code?: string) {
    super(409, message, { severity: ErrorSeverity.MEDIUM, code });
  }
}

export class TooManyRequestsError extends CustomError {
  constructor(message = 'Too many requests', code?: string) {
    super(429, message, { severity: ErrorSeverity.MEDIUM, code });
  }
}
