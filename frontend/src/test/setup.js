import "@testing-library/jest-dom";

// Mock environment variables
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_API_URL: "http://localhost:3001/api",
  },
  writable: true,
});
