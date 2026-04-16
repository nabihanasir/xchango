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
exports.deleteCourse = exports.updateCourse = exports.addCourse = exports.getCourses = void 0;
const courseService = __importStar(require("../services/courseService"));
const response_1 = require("../utils/response");
const getCourses = async (_req, res) => {
    const courses = await courseService.listHomeCourses();
    (0, response_1.sendResponse)(res, 200, 'Courses fetched successfully', courses);
};
exports.getCourses = getCourses;
const addCourse = async (req, res) => {
    const course = await courseService.createHomeCourse(req.user._id.toString(), req.body);
    (0, response_1.sendResponse)(res, 201, 'Course created successfully', course);
};
exports.addCourse = addCourse;
const updateCourse = async (req, res) => {
    const course = await courseService.updateHomeCourse(req.params.id, req.body);
    (0, response_1.sendResponse)(res, 200, 'Course updated successfully', course);
};
exports.updateCourse = updateCourse;
const deleteCourse = async (req, res) => {
    await courseService.deleteHomeCourse(req.params.id);
    (0, response_1.sendResponse)(res, 200, 'Course deleted successfully', null);
};
exports.deleteCourse = deleteCourse;
