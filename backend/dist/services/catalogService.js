"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCourses = exports.listUniversities = exports.listCountries = void 0;
const Country_1 = __importDefault(require("../models/Country"));
const University_1 = __importDefault(require("../models/University"));
const Course_1 = __importDefault(require("../models/Course"));
const listCountries = async () => Country_1.default.find().sort({ name: 1 });
exports.listCountries = listCountries;
const listUniversities = async () => University_1.default.find()
    .populate('countryId', 'name code')
    .sort({ name: 1 });
exports.listUniversities = listUniversities;
const listCourses = async (filters) => {
    const query = {};
    if (filters.universityId) {
        query.universityId = filters.universityId;
    }
    if (filters.type) {
        query.type = filters.type;
    }
    return Course_1.default.find(query)
        .populate({
        path: 'universityId',
        select: 'name countryId',
        populate: {
            path: 'countryId',
            select: 'name code',
        },
    })
        .sort({ name: 1 });
};
exports.listCourses = listCourses;
