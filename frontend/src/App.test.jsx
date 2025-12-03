import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import App from "./App";

vi.mock("axios");
const mockedAxios = axios;

describe("App Component", () => {
  const mockTasks = [
    { id: 1, title: "Test task 1", status: "pendiente" },
    { id: 2, title: "Test task 2", status: "completada" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the task manager title", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: [] } });

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText("Task Manager")).toBeInTheDocument();
  });

  it("displays loading state initially", async () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText("Loading tasks...")).toBeInTheDocument();
  });

  it("displays empty state when no tasks", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: [] } });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText("No tasks yet")).toBeInTheDocument();
      expect(
        screen.getByText("Add your first task to get started!"),
      ).toBeInTheDocument();
    });
  });

  it("displays tasks when loaded", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test task 1")).toBeInTheDocument();
      expect(screen.getByText("Test task 2")).toBeInTheDocument();
    });
  });

  it("allows adding a new task", async () => {
    const user = userEvent.setup();
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: [] } });
    mockedAxios.post.mockResolvedValueOnce({
      data: { task: { id: 3, title: "New task", status: "pendiente" } },
    });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("What needs to be done?");
    const addButton = screen.getByText("Add Task");

    await user.type(input, "New task");
    await user.click(addButton);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "http://localhost:3001/api/tasks",
      { title: "New task" },
    );
  });

  it("does not add empty tasks", async () => {
    const user = userEvent.setup();
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: [] } });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Add Task");
    await user.click(addButton);

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("allows toggling task status", async () => {
    const user = userEvent.setup();
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
    mockedAxios.put.mockResolvedValueOnce({
      data: { task: { id: 1, title: "Test task 1", status: "completada" } },
    });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test task 1")).toBeInTheDocument();
    });

    const checkbox = screen.getAllByRole("checkbox")[0];
    await user.click(checkbox);

    expect(mockedAxios.put).toHaveBeenCalledWith(
      "http://localhost:3001/api/tasks/1",
      { status: "completada" },
    );
  });

  it("allows deleting a task", async () => {
    const user = userEvent.setup();
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });
    mockedAxios.delete.mockResolvedValueOnce({});

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test task 1")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText("Delete");
    await user.click(deleteButtons[0]);

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      "http://localhost:3001/api/tasks/1",
    );
  });

  it("displays tasks with correct checkbox states", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText("Test task 1")).toBeInTheDocument();
      expect(screen.getByText("Test task 2")).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).not.toBeChecked(); // Test task 1 - pending
    expect(checkboxes[1]).toBeChecked(); // Test task 2 - completed
  });

  it("shows completed tasks with strikethrough", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: mockTasks } });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      const completedTask = screen.getByText("Test task 2");
      expect(completedTask).toHaveClass("completed");
    });
  });

  it("disables form when loading", async () => {
    const user = userEvent.setup();
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: [] } });
    mockedAxios.post.mockImplementation(() => new Promise(() => {})); // Never resolves

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("What needs to be done?");
    const addButton = screen.getByText("Add Task");

    await user.type(input, "New task");
    await user.click(addButton);

    expect(addButton).toHaveTextContent("Adding...");
    expect(addButton).toBeDisabled();
    expect(input).toBeDisabled();
  });

  it("handles API errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching tasks:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });
});
