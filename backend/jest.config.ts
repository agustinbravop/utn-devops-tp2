import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testTimeout: 10000,
  // Detect open handles to help debug hanging tests
  detectOpenHandles: true,
  // Force exit after tests
  forceExit: true,
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/app.ts", // Exclude app.ts from coverage as it's just server setup
  ],
};

export default config;
