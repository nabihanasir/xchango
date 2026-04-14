import { Response } from 'express';

export const sendResponse = (res: Response, statusCode: number, message: string, data: any = null) => {
  return res.status(statusCode).json({
    success: statusCode >= 200 && statusCode < 300,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId,
  });
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  reason: string,
  solution: string,
  code = 'REQUEST_ERROR',
) => {
  const errorPayload = {
    code,
    message,
    reason,
    solution,
    status: statusCode,
    timestamp: new Date().toISOString(),
    path: res.req?.originalUrl,
    requestId: res.locals.requestId,
  };

  return res.status(statusCode).json({
    success: false,
    code,
    message,
    error: errorPayload,
  });
};
