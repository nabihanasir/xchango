import type { NextFunction, Request, Response } from 'express';
import { asyncHandler } from './asyncHandler';

describe('asyncHandler', () => {
  it('passes rejected promises to next', async () => {
    const error = new Error('boom');
    const next = jest.fn() as NextFunction;
    const handler = asyncHandler(async () => {
      throw error;
    });

    await handler({} as Request, {} as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next when the handler resolves', async () => {
    const next = jest.fn() as NextFunction;
    const handler = asyncHandler(async () => 'ok');

    await handler({} as Request, {} as Response, next);

    expect(next).not.toHaveBeenCalled();
  });
});
