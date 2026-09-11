"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const asyncHandler_1 = require("./asyncHandler");
describe('asyncHandler', () => {
    it('passes rejected promises to next', async () => {
        const error = new Error('boom');
        const next = jest.fn();
        const handler = (0, asyncHandler_1.asyncHandler)(async () => {
            throw error;
        });
        await handler({}, {}, next);
        expect(next).toHaveBeenCalledWith(error);
    });
    it('does not call next when the handler resolves', async () => {
        const next = jest.fn();
        const handler = (0, asyncHandler_1.asyncHandler)(async () => 'ok');
        await handler({}, {}, next);
        expect(next).not.toHaveBeenCalled();
    });
});
