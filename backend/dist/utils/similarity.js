"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSimilarity = void 0;
/**
 * Simple Jaccard Similarity for string comparison
 */
const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const set1 = new Set(s1);
    const set2 = new Set(s2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
};
exports.calculateSimilarity = calculateSimilarity;
