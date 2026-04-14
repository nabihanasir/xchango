import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const attachRequestContext = (req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  req.headers['x-request-id'] = requestId;
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};
