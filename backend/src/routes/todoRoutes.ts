import { Router } from "express";
import {
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  testear,
} from "../controllers/todoController";

const router = Router();

router.get("/tasks", getTasks);
router.post("/tasks", createTask);
router.put("/tasks/:id", updateTaskStatus);
router.delete("/tasks/:id", deleteTask);

// Endpoint de prueba de carga controlada de memoria
router.post("/test", testear);

export default router;
