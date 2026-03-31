"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const authService = __importStar(require("../services/authService"));
const response_1 = require("../utils/response");
const register = async (req, res) => {
    try {
        const user = await authService.registerUser(req.body);
        (0, response_1.sendResponse)(res, 201, 'User registered successfully', user);
    }
    catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const user = await authService.loginUser(req.body);
        (0, response_1.sendResponse)(res, 200, 'Login successful', user);
    }
    catch (error) {
        res.status(401);
        throw new Error(error.message);
    }
};
exports.login = login;
const getMe = async (req, res) => {
    (0, response_1.sendResponse)(res, 200, 'User profile fetched', req.user);
};
exports.getMe = getMe;
