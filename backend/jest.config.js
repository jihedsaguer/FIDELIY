module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'js', 'json'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'nodenext',
          moduleResolution: 'nodenext',
          target: 'es2020',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          lib: ['es2020'],
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(@nestjs|better-auth)/)'],
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  roots: ['<rootDir>/src/', '<rootDir>/test/'],
  testTimeout: 60000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^better-auth/integrations/node$': '<rootDir>/src/test-utils/better-auth-node-compat.ts',
  },
};

// Set NODE_ENV=test for all tests
process.env.NODE_ENV = 'test';
