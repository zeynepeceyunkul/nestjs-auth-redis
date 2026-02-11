/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 30,
      lines: 55,
      statements: 55,
    },
  },
};
