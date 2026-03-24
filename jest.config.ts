import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!lib/firebase.ts',
    '!lib/auth-context.tsx',
    '!lib/ims-questions.ts',
    '!lib/meet-visu.ts',
    '!lib/companies.ts',
    '!lib/portal.ts',
    '!app/api/parse-cv/**',
    '!app/api/portal/**',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: { lines: 80, functions: 80, branches: 70, statements: 80 },
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react' } }],
  },
}

export default config
