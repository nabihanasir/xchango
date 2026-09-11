"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const similarity_1 = require("./similarity");
describe('calculateSimilarity', () => {
    it('returns 1 for identical text regardless of case and punctuation', () => {
        expect((0, similarity_1.calculateSimilarity)('Data Structures!', 'data structures')).toBe(1);
    });
    it('returns a partial score when only some tokens overlap', () => {
        expect((0, similarity_1.calculateSimilarity)('advanced database systems', 'database systems')).toBeCloseTo(2 / 3, 5);
    });
    it('returns 0 when strings share no common tokens', () => {
        expect((0, similarity_1.calculateSimilarity)('linear algebra', 'organic chemistry')).toBe(0);
    });
});
