import request from "supertest";
import app from "./app";

describe("Todo API Basic Tests", () => {
  describe("POST /api/test", () => {
    it("should add two numbers correctly", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({ num1: 1, num2: 3 });

      expect(response.status).toBe(200);
      expect(response.body).toBe(4);
    });

    it("should handle zero values", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({ num1: 0, num2: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toBe(5);
    });

    it("should handle both zero values", async () => {
      const response = await request(app)
        .post("/api/test")
        .send({ num1: 0, num2: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toBe(0);
    });
  });

  describe("API Health Check", () => {
    it("should respond to GET requests on all endpoints", async () => {
      // Test that the app is properly configured
      const response = await request(app).get("/api/tasks");

      // Should not return 404 (endpoint exists)
      expect(response.status).not.toBe(404);
    });
  });
});
