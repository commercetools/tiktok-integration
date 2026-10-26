/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  roots: ["<rootDir>/service/src", "<rootDir>/shared/services"],
  modulePaths: ['<rootDir>/service/node_modules'],
  testMatch: ['**/*.spec.ts'],
  clearMocks: true,
  transform: {
    '^.+\\.ts$': [
      require.resolve('ts-jest'),
      { tsconfig: '<rootDir>/service/tsconfig.json', diagnostics: true },
    ],
  },
};
