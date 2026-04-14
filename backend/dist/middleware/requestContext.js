"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachRequestContext = void 0;
const crypto_1 = require("crypto");
const attachRequestContext = (req, res, next) => {
    const requestId = (0, crypto_1.randomUUID)();
    req.headers['x-request-id'] = requestId;
    res.locals.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
};
exports.attachRequestContext = attachRequestContext;
