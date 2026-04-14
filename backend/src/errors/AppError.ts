export interface ErrorPayload {
  code: string;
  message: string;
  reason: string;
  solution: string;
  status: number;
}

export class AppError extends Error {
  code: string;
  reason: string;
  solution: string;
  status: number;
  isOperational: boolean;

  constructor({ code, message, reason, solution, status }: ErrorPayload) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.reason = reason;
    this.solution = solution;
    this.status = status;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, reason: string, solution: string, code = 'VALIDATION_ERROR') {
    super({ code, message, reason, solution, status: 400 });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, reason: string, solution: string, code = 'AUTHENTICATION_ERROR') {
    super({ code, message, reason, solution, status: 401 });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, reason: string, solution: string, code = 'FORBIDDEN') {
    super({ code, message, reason, solution, status: 403 });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, reason: string, solution: string, code = 'NOT_FOUND') {
    super({ code, message, reason, solution, status: 404 });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, reason: string, solution: string, code = 'DATABASE_ERROR') {
    super({ code, message, reason, solution, status: 500 });
  }
}
