import request from "supertest";
import app from "./app";
import { mockRedis } from "./test-setup";

describe("Todo API Integration Tests", () => {
  describe("GET /api/tasks", () => {
    it("should return empty array when no tasks exist", async () => {
      mockRedis.keys.mockResolvedValue([]);

      const response = await request(app).get("/api/tasks");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "No se encontraron tareas.",
        tasks: [],
      });
      expect(mockRedis.keys).toHaveBeenCalledWith("task:*");
    });

    it("should return all tasks when they exist", async () => {
      const mockTaskKeys = ["task:123", "task:456"];
      const mockTasks = [
        { id: "123", title: "Task 1", status: "pendiente" },
        { id: "456", title: "Task 2", status: "completada" },
      ];

      mockRedis.keys.mockResolvedValue(mockTaskKeys);
      mockRedis.hgetall
        .mockResolvedValueOnce(mockTasks[0])
        .mockResolvedValueOnce(mockTasks[1]);

      const response = await request(app).get("/api/tasks");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Tareas obtenidas exitosamente.",
        tasks: mockTasks,
      });
      expect(mockRedis.keys).toHaveBeenCalledWith("task:*");
      expect(mockRedis.hgetall).toHaveBeenCalledTimes(2);
    });

    it("should handle Redis errors gracefully", async () => {
      mockRedis.keys.mockRejectedValue(new Error("Redis connection failed"));

      const response = await request(app).get("/api/tasks");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Error interno del servidor.",
        error: expect.any(Object),
      });
    });
  });

  describe("POST /api/tasks", () => {
    it("should create a new task successfully", async () => {
      const newTask = { title: "New Task" };
      mockRedis.hset.mockResolvedValue(1);

      const response = await request(app).post("/api/tasks").send(newTask);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: "Tarea creada exitosamente.",
        task: {
          id: expect.any(String),
          title: "New Task",
          status: "pendiente",
        },
      });
      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.stringMatching(/^task:[a-f0-9-]+$/),
        expect.objectContaining({
          id: expect.any(String),
          title: "New Task",
          status: "pendiente",
        }),
      );
    });

    it("should return 400 when title is missing", async () => {
      const response = await request(app).post("/api/tasks").send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "El título de la tarea es requerido.",
      });
    });

    it("should return 400 when title is empty", async () => {
      const response = await request(app)
        .post("/api/tasks")
        .send({ title: "" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "El título de la tarea es requerido.",
      });
    });

    it("should handle Redis errors when creating task", async () => {
      const newTask = { title: "New Task" };
      mockRedis.hset.mockRejectedValue(new Error("Redis write failed"));

      const response = await request(app).post("/api/tasks").send(newTask);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Error interno del servidor.",
        error: expect.any(Object),
      });
    });
  });

  describe("PUT /api/tasks/:id", () => {
    it("should update task status successfully", async () => {
      const taskId = "123";
      const updateData = { status: "completada" };
      const updatedTask = { id: taskId, title: "Task 1", status: "completada" };

      mockRedis.exists.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.hgetall.mockResolvedValue(updatedTask);

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Estado de la tarea actualizado exitosamente.",
        task: updatedTask,
      });
      expect(mockRedis.exists).toHaveBeenCalledWith(`task:${taskId}`);
      expect(mockRedis.hset).toHaveBeenCalledWith(
        `task:${taskId}`,
        "status",
        "completada",
      );
      expect(mockRedis.hgetall).toHaveBeenCalledWith(`task:${taskId}`);
    });

    it("should return 404 when task does not exist", async () => {
      const taskId = "nonexistent";
      const updateData = { status: "completada" };

      mockRedis.exists.mockResolvedValue(0);

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Tarea no encontrada.",
      });
    });

    it("should return 400 when status is invalid", async () => {
      const taskId = "123";
      const updateData = { status: "invalid" };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message:
          'El estado de la tarea es inválido. Debe ser "pendiente" o "completada".',
      });
    });

    it("should return 400 when status is missing", async () => {
      const taskId = "123";

      const response = await request(app).put(`/api/tasks/${taskId}`).send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message:
          'El estado de la tarea es inválido. Debe ser "pendiente" o "completada".',
      });
    });

    it("should handle Redis errors when updating task", async () => {
      const taskId = "123";
      const updateData = { status: "completada" };

      mockRedis.exists.mockRejectedValue(new Error("Redis connection failed"));

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updateData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Error interno del servidor.",
        error: expect.any(Object),
      });
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete task successfully", async () => {
      const taskId = "123";

      mockRedis.exists.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      const response = await request(app).delete(`/api/tasks/${taskId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Tarea eliminada exitosamente.",
        taskId: taskId,
      });
      expect(mockRedis.exists).toHaveBeenCalledWith(`task:${taskId}`);
      expect(mockRedis.del).toHaveBeenCalledWith(`task:${taskId}`);
    });

    it("should return 404 when task does not exist", async () => {
      const taskId = "nonexistent";

      mockRedis.exists.mockResolvedValue(0);

      const response = await request(app).delete(`/api/tasks/${taskId}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        message: "Tarea no encontrada.",
      });
    });

    it("should handle Redis errors when deleting task", async () => {
      const taskId = "123";

      mockRedis.exists.mockRejectedValue(new Error("Redis connection failed"));

      const response = await request(app).delete(`/api/tasks/${taskId}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Error interno del servidor.",
        error: expect.any(Object),
      });
    });
  });

  describe("POST /api/test", () => {
    it("should add two numbers correctly", async () => {
      const testData = { num1: 5, num2: 3 };

      const response = await request(app).post("/api/test").send(testData);

      expect(response.status).toBe(200);
      expect(response.body).toBe(8);
    });

    it("should handle negative numbers", async () => {
      const testData = { num1: -5, num2: 3 };

      const response = await request(app).post("/api/test").send(testData);

      expect(response.status).toBe(200);
      expect(response.body).toBe(-2);
    });

    it("should handle decimal numbers", async () => {
      const testData = { num1: 1.5, num2: 2.5 };

      const response = await request(app).post("/api/test").send(testData);

      expect(response.status).toBe(200);
      expect(response.body).toBe(4);
    });
  });
});
