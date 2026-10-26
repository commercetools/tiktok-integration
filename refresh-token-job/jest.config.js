/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // Files under ../shared import packages that are installed in this app only.
  modulePaths: ['<rootDir>/node_modules'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
};
