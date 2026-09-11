"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const response_1 = require("./response");
const createResponseMock = () => {
    const res = {
        locals: { requestId: 'req-123' },
        req: { originalUrl: '/api/test' },
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };
    return res;
};
describe('response helpers', () => {
    it('sends a success payload with request metadata', () => {
        const res = createResponseMock();
        (0, response_1.sendResponse)(res, 200, 'Fetched successfully', { ok: true });
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
        (0, response_1.sendError)(res, 404, 'Not found', 'Record missing', 'Check the identifier.', 'NOT_FOUND');
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
