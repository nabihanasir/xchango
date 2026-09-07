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
exports.endOnlineClass = exports.startOnlineClass = exports.getOnlineClasses = void 0;
const onlineClassService = __importStar(require("../services/onlineClassService"));
const response_1 = require("../utils/response");
const getOnlineClasses = async (req, res) => {
    const classes = onlineClassService.listOnlineClasses(req.user?.name);
    (0, response_1.sendResponse)(res, 200, 'Online classes fetched successfully', {
        classes,
        provider: 'Jitsi Meet',
        roomPassword: onlineClassService.getRoomPasswordHint(),
    });
};
exports.getOnlineClasses = getOnlineClasses;
const startOnlineClass = async (req, res) => {
    try {
        const classItem = onlineClassService.startOnlineClass(req.params.id, req.user?.name || 'Host');
        (0, response_1.sendResponse)(res, 200, 'Class started successfully', classItem);
    }
    catch (error) {
        const statusCode = error?.statusCode || 500;
        (0, response_1.sendResponse)(res, statusCode, error?.message || 'Unable to start class');
    }
};
exports.startOnlineClass = startOnlineClass;
const endOnlineClass = async (req, res) => {
    try {
        const classItem = onlineClassService.endOnlineClass(req.params.id, req.user?.name);
        (0, response_1.sendResponse)(res, 200, 'Class ended successfully', classItem);
    }
    catch (error) {
        const statusCode = error?.statusCode || 500;
        (0, response_1.sendResponse)(res, statusCode, error?.message || 'Unable to end class');
    }
};
exports.endOnlineClass = endOnlineClass;
