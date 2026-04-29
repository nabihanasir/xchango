module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  cacheDirectory: '<rootDir>/.jest-cache',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/seed.ts',
    '!src/importUniversityCatalog.ts',
    '!src/**/*.test.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
