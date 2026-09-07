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
exports.getAllResultsForAdmin = exports.upsertResult = exports.getAdvisorGradableItems = exports.getStudentResults = void 0;
const response_1 = require("../utils/response");
const Result_1 = require("../models/Result");
const upload_1 = require("../utils/upload");
const resultService = __importStar(require("../services/resultService"));
const getStudentResults = async (req, res) => {
    const results = await resultService.getStudentResults(req.user._id.toString());
    (0, response_1.sendResponse)(res, 200, 'Results fetched successfully', results);
};
exports.getStudentResults = getStudentResults;
const getAdvisorGradableItems = async (req, res) => {
    const items = await resultService.getAdvisorGradableItems(req.user._id.toString());
    (0, response_1.sendResponse)(res, 200, 'Gradable courses fetched successfully', items);
};
exports.getAdvisorGradableItems = getAdvisorGradableItems;
const upsertResult = async (req, res) => {
    const status = req.body.status === Result_1.ResultStatus.PUBLISHED ? Result_1.ResultStatus.PUBLISHED : Result_1.ResultStatus.DRAFT;
    const result = await resultService.upsertResult(req.user._id.toString(), req.params.courseRequestItemId, {
        grade: req.body.grade,
        marks: req.body.marks !== undefined && req.body.marks !== '' ? Number(req.body.marks) : null,
        remarks: req.body.remarks || '',
        status,
        resultFileUrl: req.file ? (0, upload_1.toPublicFileUrl)(req.file.path) : undefined,
    });
    (0, response_1.sendResponse)(res, 200, 'Result saved successfully', result);
};
exports.upsertResult = upsertResult;
const getAllResultsForAdmin = async (_req, res) => {
    const results = await resultService.getAllResultsForAdmin();
    (0, response_1.sendResponse)(res, 200, 'Results fetched successfully', results);
};
exports.getAllResultsForAdmin = getAllResultsForAdmin;
