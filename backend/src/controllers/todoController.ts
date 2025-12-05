import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

let client = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Variable global para simular carga de memoria manteniendo las referencias
const memoryStore: string[] = [];

export const getTasks = async (_req: Request, res: Response) => {
  const redisClient = client;
  try {
    const taskKeys = await redisClient.keys("task:*");

    if (taskKeys.length === 0) {
      return res
        .status(200)
        .json({ message: "No se encontraron tareas.", tasks: [] });
    }

    const tasksPromises = taskKeys.map(async (key: string) => {
      const taskData = await redisClient.hgetall(key);

      return {
        id: taskData.id,
        title: taskData.title,
        status: taskData.status as "pendiente" | "completada",
      };
    });

    const tasks = await Promise.all(tasksPromises);

    res.status(200).json({ message: "Tareas obtenidas exitosamente.", tasks });
  } catch (error) {
    console.error("Error al obtener tareas:", error);
    res.status(500).json({ message: "Error interno del servidor.", error });
  }
};

export const createTask = async (req: Request, res: Response) => {
  const redisClient = client;
  try {
    const { title } = req.body;

    if (!title) {
      return res
        .status(400)
        .json({ message: "El título de la tarea es requerido." });
    }

    const taskId = uuidv4();
    const newTaskKey = `task:${taskId}`;
    const task = {
      id: taskId,
      title: title,
      status: "pendiente",
    };

    await redisClient.hset(newTaskKey, task);

    res.status(201).json({ message: "Tarea creada exitosamente.", task });
  } catch (error) {
    console.error("Error al crear la tarea:", error);
    res.status(500).json({ message: "Error interno del servidor.", error });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  const redisClient = client;
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || (status !== "pendiente" && status !== "completada")) {
      return res.status(400).json({
        message:
          'El estado de la tarea es inválido. Debe ser "pendiente" o "completada".',
      });
    }

    const taskKey = `task:${id}`;

    const taskExists = await redisClient.exists(taskKey);
    if (taskExists === 0) {
      return res.status(404).json({ message: "Tarea no encontrada." });
    }

    await redisClient.hset(taskKey, "status", status);

    const updatedTask = await redisClient.hgetall(taskKey);

    res.status(200).json({
      message: "Estado de la tarea actualizado exitosamente.",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error al actualizar la tarea:", error);
    res.status(500).json({ message: "Error interno del servidor.", error });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  const redisClient = client;
  try {
    const { id } = req.params;

    const taskKey = `task:${id}`;

    const taskExists = await redisClient.exists(taskKey);
    if (taskExists === 0) {
      return res.status(404).json({ message: "Tarea no encontrada." });
    }

    await redisClient.del(taskKey);

    res.status(200).json({
      message: "Tarea eliminada exitosamente.",
      taskId: id,
    });
  } catch (error) {
    console.error("Error al eliminar la tarea:", error);
    res.status(500).json({ message: "Error interno del servidor.", error });
  }
};

/**
 * Endpoint para generar carga controlada de memoria.
 *
 * Body esperado:
 * {
 *   "iterations": number (opcional, por defecto 10, máximo 1000),
 *   "sizeMb": number (MB por iteración, por defecto 5, máximo 50),
 *   "action": "allocate" | "clear" (por defecto "allocate")
 * }
 *
 * - action = "allocate": reserva memoria y la mantiene en memoryStore.
 * - action = "clear": limpia memoryStore (libera referencias).
 */
export const testear = async (req: Request, res: Response) => {
  try {
    const { iterations = 10, sizeMb = 5, action = "allocate" } = req.body || {};

    if (action === "clear") {
      memoryStore.length = 0;

      // Opcional: si Node se ejecuta con --expose-gc, intenta forzar GC
      if (typeof global.gc === "function") {
        try {
          global.gc();
        } catch {
          // ignorar errores si no está disponible
        }
      }

      return res.status(200).json({
        message: "Memoria liberada exitosamente.",
        storedChunks: memoryStore.length,
      });
    }

    // Valores seguros para no matar al servidor de un solo golpe
    const safeIterations = Math.max(1, Math.min(Number(iterations) || 0, 1000));
    const safeSizeMb = Math.max(1, Math.min(Number(sizeMb) || 0, 50));

    const bytes = safeSizeMb * 1024 * 1024;

    for (let i = 0; i < safeIterations; i++) {
      // Cada chunk es un string grande de tamaño aproximado "bytes"
      const chunk = "x".repeat(bytes);
      memoryStore.push(chunk);
    }

    const totalBytes = memoryStore.reduce(
      (acc, chunk) => acc + chunk.length,
      0
    );
    const totalMb = totalBytes / (1024 * 1024);

    return res.status(200).json({
      message: "Carga de memoria ejecutada exitosamente.",
      requested: {
        iterations: safeIterations,
        sizeMb: safeSizeMb,
        action: "allocate",
      },
      storedChunks: memoryStore.length,
      estimatedAllocatedMb: Number(totalMb.toFixed(2)),
    });
  } catch (error) {
    console.error("Error durante la prueba de carga de memoria:", error);
    return res.status(500).json({
      message: "Error interno durante la prueba de carga de memoria.",
    });
  }
};
