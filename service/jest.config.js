/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  transform: {
    '^.+\\.ts$': [
      require.resolve('ts-jest'),
      { tsconfig: '<rootDir>/tsconfig.json', diagnostics: true },
    ],
  },
};
