export interface ApiErrorDetails {
  code: string;
  message: string;
  reason: string;
  solution: string;
  status: number;
  timestamp: string;
  path: string;
  requestId?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorDetails;
}

export class AppApiError extends Error {
  code: string;
  reason: string;
  solution: string;
  status: number;
  timestamp: string;
  path: string;
  requestId?: string;

  constructor(error: ApiErrorDetails) {
    super(error.message);
    this.name = 'AppApiError';
    this.code = error.code;
    this.reason = error.reason;
    this.solution = error.solution;
    this.status = error.status;
    this.timestamp = error.timestamp;
    this.path = error.path;
    this.requestId = error.requestId;
  }
}
