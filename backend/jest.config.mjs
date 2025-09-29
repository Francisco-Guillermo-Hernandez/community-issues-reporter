export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: [
        '**/**/*.test.ts'
    ],
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/**/*.d.ts",
        "!src/**/*seed.ts",           
        "!src/**/*launcher.ts",  
        "!src/**/*router.ts",         
        "!src/**/seed*.ts",           
        "!src/**/seeds/**/*.ts",      
        "!src/common/validators.ts",
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['json', 'lcov', 'text', 'clover'],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: {
                paths: {
                    '~/*': ['./src/*']
                }
            }
        }]
    },
    moduleNameMapper: {
        '^~/(.*)$': '<rootDir>/src/$1',
    },
    // setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
};
