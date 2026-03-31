"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllMappings = exports.createCourseMapping = void 0;
const Course_1 = __importDefault(require("../models/Course"));
const CourseMapping_1 = __importDefault(require("../models/CourseMapping"));
const similarity_1 = require("../utils/similarity");
const createCourseMapping = async (homeCourseId, targetCourseId, applicationId) => {
    const homeCourse = await Course_1.default.findById(homeCourseId);
    const targetCourse = await Course_1.default.findById(targetCourseId);
    if (!homeCourse || !targetCourse) {
        throw new Error('Course not found');
    }
    const similarityScore = (0, similarity_1.calculateSimilarity)(homeCourse.name, targetCourse.name);
    return await CourseMapping_1.default.create({
        applicationId,
        homeCourseId,
        hostCourseId: targetCourseId,
        similarityScore,
        status: 'pending',
    });
};
exports.createCourseMapping = createCourseMapping;
const getAllMappings = async () => {
    return await CourseMapping_1.default.find().populate('homeCourseId hostCourseId advisorId');
};
exports.getAllMappings = getAllMappings;
