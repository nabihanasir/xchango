module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  cacheDirectory: '<rootDir>/.jest-cache',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageDirectory: '<rootDir>/coverage',
  testPathIgnorePatterns: ['/node_modules/'],
};
