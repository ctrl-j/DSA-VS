module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['**/*.test.ts'],
};
