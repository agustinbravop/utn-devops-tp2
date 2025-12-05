import { Router } from "express";
import {
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  testear,
  generateControlledLoad,
} from "../controllers/todoController";

const router = Router();

router.get("/tasks", getTasks);
router.post("/tasks", createTask);
router.put("/tasks/:id", updateTaskStatus);
router.delete("/tasks/:id", deleteTask);

// Endpoint de prueba simple
router.post("/test", testear);

// NUEVO: endpoint para generar carga controlada
// (ideal para enganchar a un botón sutil en el front)
router.post("/tasks/generate-load", generateControlledLoad);

export default router;
