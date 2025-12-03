import { Request, Response } from "express";
import {
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  testear,
} from "./todoController";
import { mockRedis } from "../test-setup";

// Mock Express Request and Response objects
const mockRequest = (overrides = {}) =>
  ({
    body: {},
    params: {},
    query: {},
    ...overrides,
  }) as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Todo Controllers Unit Tests", () => {
  describe("getTasks", () => {
    it("should return empty tasks array when no tasks exist", async () => {
      const req = mockRequest();
      const res = mockResponse();

      mockRedis.keys.mockResolvedValue([]);

      await getTasks(req, res);

      expect(mockRedis.keys).toHaveBeenCalledWith("task:*");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "No se encontraron tareas.",
        tasks: [],
      });
    });

    it("should return tasks when they exist", async () => {
      const req = mockRequest();
      const res = mockResponse();
      const mockTaskKeys = ["task:123", "task:456"];
      const mockTasks = [
        { id: "123", title: "Task 1", status: "pendiente" },
        { id: "456", title: "Task 2", status: "completada" },
      ];

      mockRedis.keys.mockResolvedValue(mockTaskKeys);
      mockRedis.hgetall
        .mockResolvedValueOnce(mockTasks[0])
        .mockResolvedValueOnce(mockTasks[1]);

      await getTasks(req, res);

      expect(mockRedis.keys).toHaveBeenCalledWith("task:*");
      expect(mockRedis.hgetall).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tareas obtenidas exitosamente.",
        tasks: mockTasks,
      });
    });

    it("should handle errors gracefully", async () => {
      const req = mockRequest();
      const res = mockResponse();
      const error = new Error("Redis connection failed");

      mockRedis.keys.mockRejectedValue(error);

      await getTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error interno del servidor.",
        error: expect.any(Object),
      });
    });
  });

  describe("createTask", () => {
    it("should create a task successfully", async () => {
      const req = mockRequest({ body: { title: "New Task" } });
      const res = mockResponse();

      mockRedis.hset.mockResolvedValue(1);

      await createTask(req, res);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.stringMatching(/^task:[a-f0-9-]+$/),
        expect.objectContaining({
          id: expect.any(String),
          title: "New Task",
          status: "pendiente",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tarea creada exitosamente.",
        task: {
          id: expect.any(String),
          title: "New Task",
          status: "pendiente",
        },
      });
    });

    it("should return 400 when title is missing", async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "El título de la tarea es requerido.",
      });
    });

    it("should return 400 when title is empty", async () => {
      const req = mockRequest({ body: { title: "" } });
      const res = mockResponse();

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "El título de la tarea es requerido.",
      });
    });

    it("should handle errors gracefully", async () => {
      const req = mockRequest({ body: { title: "New Task" } });
      const res = mockResponse();
      const error = new Error("Redis write failed");

      mockRedis.hset.mockRejectedValue(error);

      await createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error interno del servidor.",
        error: expect.any(Object),
      });
    });
  });

  describe("updateTaskStatus", () => {
    it("should update task status successfully", async () => {
      const taskId = "123";
      const req = mockRequest({
        params: { id: taskId },
        body: { status: "completada" },
      });
      const res = mockResponse();
      const updatedTask = { id: taskId, title: "Task 1", status: "completada" };

      mockRedis.exists.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.hgetall.mockResolvedValue(updatedTask);

      await updateTaskStatus(req, res);

      expect(mockRedis.exists).toHaveBeenCalledWith(`task:${taskId}`);
      expect(mockRedis.hset).toHaveBeenCalledWith(
        `task:${taskId}`,
        "status",
        "completada",
      );
      expect(mockRedis.hgetall).toHaveBeenCalledWith(`task:${taskId}`);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Estado de la tarea actualizado exitosamente.",
        task: updatedTask,
      });
    });

    it("should return 404 when task does not exist", async () => {
      const taskId = "nonexistent";
      const req = mockRequest({
        params: { id: taskId },
        body: { status: "completada" },
      });
      const res = mockResponse();

      mockRedis.exists.mockResolvedValue(0);

      await updateTaskStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tarea no encontrada.",
      });
    });

    it("should return 400 when status is invalid", async () => {
      const taskId = "123";
      const req = mockRequest({
        params: { id: taskId },
        body: { status: "invalid" },
      });
      const res = mockResponse();

      await updateTaskStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message:
          'El estado de la tarea es inválido. Debe ser "pendiente" o "completada".',
      });
    });

    it("should return 400 when status is missing", async () => {
      const taskId = "123";
      const req = mockRequest({
        params: { id: taskId },
        body: {},
      });
      const res = mockResponse();

      await updateTaskStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message:
          'El estado de la tarea es inválido. Debe ser "pendiente" o "completada".',
      });
    });

    it("should handle errors gracefully", async () => {
      const taskId = "123";
      const req = mockRequest({
        params: { id: taskId },
        body: { status: "completada" },
      });
      const res = mockResponse();
      const error = new Error("Redis connection failed");

      mockRedis.exists.mockRejectedValue(error);

      await updateTaskStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error interno del servidor.",
        error: expect.any(Object),
      });
    });
  });

  describe("deleteTask", () => {
    it("should delete task successfully", async () => {
      const taskId = "123";
      const req = mockRequest({ params: { id: taskId } });
      const res = mockResponse();

      mockRedis.exists.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      await deleteTask(req, res);

      expect(mockRedis.exists).toHaveBeenCalledWith(`task:${taskId}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`task:${taskId}`);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tarea eliminada exitosamente.",
        taskId: taskId,
      });
    });

    it("should return 404 when task does not exist", async () => {
      const taskId = "nonexistent";
      const req = mockRequest({ params: { id: taskId } });
      const res = mockResponse();

      mockRedis.exists.mockResolvedValue(0);

      await deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tarea no encontrada.",
      });
    });

    it("should handle errors gracefully", async () => {
      const taskId = "123";
      const req = mockRequest({ params: { id: taskId } });
      const res = mockResponse();
      const error = new Error("Redis connection failed");

      mockRedis.exists.mockRejectedValue(error);

      await deleteTask(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error interno del servidor.",
        error: expect.any(Object),
      });
    });
  });

  describe("testear", () => {
    it("should add two numbers correctly", async () => {
      const req = mockRequest({ body: { num1: 5, num2: 3 } });
      const res = mockResponse();

      await testear(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(8);
    });

    it("should handle negative numbers", async () => {
      const req = mockRequest({ body: { num1: -5, num2: 3 } });
      const res = mockResponse();

      await testear(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(-2);
    });

    it("should handle decimal numbers", async () => {
      const req = mockRequest({ body: { num1: 1.5, num2: 2.5 } });
      const res = mockResponse();

      await testear(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(4);
    });

    it("should handle string concatenation when given non-numeric input", async () => {
      const req = mockRequest({ body: { num1: "invalid", num2: 3 } });
      const res = mockResponse();

      await testear(req, res);

      // JavaScript converts "invalid" + 3 to "invalid3"
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith("invalid3");
    });
  });
});
