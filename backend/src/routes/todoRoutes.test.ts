import request from "supertest";
import express from "express";
import todoRoutes from "./todoRoutes";
import { mockRedis } from "../test-setup";

// Create a test app with the routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api", todoRoutes);
  return app;
};

describe("Todo Routes", () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("GET /api/tasks", () => {
    it("should route to getTasks controller", async () => {
      mockRedis.keys.mockResolvedValue([]);

      const response = await request(app).get("/api/tasks");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "No se encontraron tareas.",
        tasks: [],
      });
    });
  });

  describe("POST /api/tasks", () => {
    it("should route to createTask controller", async () => {
      mockRedis.hset.mockResolvedValue(1);

      const response = await request(app)
        .post("/api/tasks")
        .send({ title: "Test Task" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: "Tarea creada exitosamente.",
        task: {
          id: expect.any(String),
          title: "Test Task",
          status: "pendiente",
        },
      });
    });
  });

  describe("PUT /api/tasks/:id", () => {
    it("should route to updateTaskStatus controller", async () => {
      const taskId = "123";
      mockRedis.exists.mockResolvedValue(1);
      mockRedis.hset.mockResolvedValue(1);
      mockRedis.hgetall.mockResolvedValue({
        id: taskId,
        title: "Test Task",
        status: "completada",
      });

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ status: "completada" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Estado de la tarea actualizado exitosamente.",
        task: {
          id: taskId,
          title: "Test Task",
          status: "completada",
        },
      });
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should route to deleteTask controller", async () => {
      const taskId = "123";
      mockRedis.exists.mockResolvedValue(1);
      mockRedis.del.mockResolvedValue(1);

      const response = await request(app).delete(`/api/tasks/${taskId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Tarea eliminada exitosamente.",
        taskId: taskId,
      });
    });
  });

  describe("POST /api/test", () => {
    it("should route to testear controller", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({ num1: 2, num2: 3 });

      expect(response.status).toBe(200);
      expect(response.body).toBe(5);
    });
  });
});
