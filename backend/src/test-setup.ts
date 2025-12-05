import Redis from "ioredis";
import client from "prom-client";

// Mock Redis client
jest.mock("ioredis");

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  console.info = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
});

// Mock Redis instance
export const mockRedis = {
  keys: jest.fn(),
  hgetall: jest.fn(),
  hset: jest.fn(),
  exists: jest.fn(),
  del: jest.fn(),
  disconnect: jest.fn(),
};

// Mock the Redis constructor
(Redis as jest.MockedClass<typeof Redis>).mockImplementation(
  () => mockRedis as unknown as Redis,
);

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  client.register.resetMetrics();
});
