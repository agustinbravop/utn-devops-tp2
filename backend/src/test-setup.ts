import Redis from "ioredis";

// Mock Redis client
jest.mock("ioredis");

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
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
});
