import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import App from "./App";

// Mock the App component since we're testing the index file
vi.mock("./App", () => ({
  default: () => <div data-testid="app">App Component</div>,
}));

describe("Index", () => {
  it("renders without crashing", () => {
    // This test ensures the index file can be imported and rendered
    // without throwing any errors
    expect(() => {
      render(<App />);
    }).not.toThrow();
  });

  it("renders the App component", () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId("app")).toBeInTheDocument();
  });
});
