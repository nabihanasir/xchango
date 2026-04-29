import type { Response } from 'express';
import { sendError, sendResponse } from './response';

const createResponseMock = () => {
  const res = {
    locals: { requestId: 'req-123' },
    req: { originalUrl: '/api/test' },
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
};

describe('response helpers', () => {
  it('sends a success payload with request metadata', () => {
    const res = createResponseMock();

    sendResponse(res, 200, 'Fetched successfully', { ok: true });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Fetched successfully',
      data: { ok: true },
      timestamp: expect.any(String),
      requestId: 'req-123',
    });
  });

  it('sends a structured error payload', () => {
    const res = createResponseMock();

    sendError(res, 404, 'Not found', 'Record missing', 'Check the identifier.', 'NOT_FOUND');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'NOT_FOUND',
      message: 'Not found',
      error: {
        code: 'NOT_FOUND',
        message: 'Not found',
        reason: 'Record missing',
        solution: 'Check the identifier.',
        status: 404,
        timestamp: expect.any(String),
        path: '/api/test',
        requestId: 'req-123',
      },
    });
  });
});
