import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import App from "./App";

// Mock axios
vi.mock("axios");
const mockedAxios = axios;

describe("App Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("complete user flow: load tasks, add task, toggle status, delete task", async () => {
    const user = userEvent.setup();

    // Mock initial empty state
    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: [] } });

    // Mock task creation
    mockedAxios.post.mockResolvedValueOnce({
      data: { task: { id: 1, title: "New task", status: "pendiente" } },
    });

    // Mock task status update
    mockedAxios.put.mockResolvedValueOnce({
      data: { task: { id: 1, title: "New task", status: "completada" } },
    });

    // Mock task deletion
    mockedAxios.delete.mockResolvedValueOnce({});

    await act(async () => {
      render(<App />);
    });

    // 1. Verify empty state
    await waitFor(() => {
      expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    });

    // 2. Add a new task
    const input = screen.getByPlaceholderText("What needs to be done?");
    const addButton = screen.getByText("Add Task");

    await user.type(input, "New task");
    await user.click(addButton);

    // Verify task was created
    await waitFor(() => {
      expect(screen.getByText("New task")).toBeInTheDocument();
    });

    // 3. Toggle task status to completed
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    // Verify status was updated (checkbox should be checked)
    await waitFor(() => {
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    // 4. Delete the task
    const deleteButton = screen.getByText("Delete");
    await user.click(deleteButton);

    // Verify task was deleted and we're back to empty state
    await waitFor(() => {
      expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    });

    // Verify all API calls were made
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "http://localhost:3001/api/tasks",
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "http://localhost:3001/api/tasks",
      { title: "New task" },
    );
    expect(mockedAxios.put).toHaveBeenCalledWith(
      "http://localhost:3001/api/tasks/1",
      { status: "completada" },
    );
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      "http://localhost:3001/api/tasks/1",
    );
  });

  it("handles multiple tasks correctly", async () => {
    userEvent.setup();
    const multipleTasks = [
      { id: 1, title: "Task 1", status: "pendiente" },
      { id: 2, title: "Task 2", status: "completada" },
      { id: 3, title: "Task 3", status: "pendiente" },
    ];

    mockedAxios.get.mockResolvedValueOnce({ data: { tasks: multipleTasks } });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
      expect(screen.getByText("Task 2")).toBeInTheDocument();
      expect(screen.getByText("Task 3")).toBeInTheDocument();
    });

    // Verify checkbox states are correct
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);

    // Verify individual checkbox states
    expect(checkboxes[0]).not.toBeChecked(); // Task 1 - pending
    expect(checkboxes[1]).toBeChecked(); // Task 2 - completed
    expect(checkboxes[2]).not.toBeChecked(); // Task 3 - pending
  });
});
