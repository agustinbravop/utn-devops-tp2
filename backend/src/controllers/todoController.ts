import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Redis from "ioredis";

type TaskStatus = "pendiente" | "completada";

const client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

export const getTasks = async (_req: Request, res: Response) => {
  try {
    const taskKeys = await client.keys("task:*");

    if (taskKeys.length === 0) {
      return res
        .status(200)
        .json({ message: "No se encontraron tareas.", tasks: [] });
    }

    const tasksPromises = taskKeys.map(async (key: string) => {
      const taskData = await client.hgetall(key);

      return {
        id: taskData.id,
        title: taskData.title,
        status: taskData.status as TaskStatus,
      };
    });

    const tasks = await Promise.all(tasksPromises);

    res.status(200).json({ message: "Tareas obtenidas exitosamente.", tasks });
  } catch (error) {
    console.error("Error al obtener tareas:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: (error as Error).message,
    });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const { title } = req.body;

    if (!title || typeof title !== "string") {
      return res.status(400).json({
        message: "El título de la tarea es requerido y debe ser texto.",
      });
    }

    const taskId = uuidv4();
    const newTaskKey = `task:${taskId}`;
    const task = {
      id: taskId,
      title: title.trim(),
      status: "pendiente" as TaskStatus,
    };

    await client.hset(newTaskKey, task);

    res.status(201).json({ message: "Tarea creada exitosamente.", task });
  } catch (error) {
    console.error("Error al crear la tarea:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: (error as Error).message,
    });
  }
};

export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== "pendiente" && status !== "completada") {
      return res.status(400).json({
        message:
          'El estado de la tarea es inválido. Debe ser "pendiente" o "completada".',
      });
    }

    const taskKey = `task:${id}`;

    const taskExists = await client.exists(taskKey);
    if (taskExists === 0) {
      res.status(404).json({ message: "Tarea no encontrada." });
      return;
    }

    await client.hset(taskKey, "status", status);

    const updatedTask = await client.hgetall(taskKey);

    res.status(200).json({
      message: "Estado de la tarea actualizado exitosamente.",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Error al actualizar la tarea:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: (error as Error).message,
    });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const taskKey = `task:${id}`;

    const taskExists = await client.exists(taskKey);
    if (taskExists === 0) {
      return res.status(404).json({ message: "Tarea no encontrada." });
    }

    await client.del(taskKey);

    res.status(200).json({
      message: "Tarea eliminada exitosamente.",
      taskId: id,
    });
  } catch (error) {
    console.error("Error al eliminar la tarea:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: (error as Error).message,
    });
  }
};

export const testear = async (req: Request, res: Response) => {
  try {
    const { num1, num2 } = req.body;

    const a = Number(num1);
    const b = Number(num2);

    if (Number.isNaN(a) || Number.isNaN(b)) {
      return res.status(400).json({
        message: "num1 y num2 deben ser numéricos.",
      });
    }

    const result = a + b;
    res.status(200).json({ result });
  } catch (error) {
    console.error("Error en testear:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: (error as Error).message,
    });
  }
};

/**
 * Genera carga controlada sobre Redis creando varias tareas "dummy".
 * Pensado para enganchar a un botón sutil en el front.
 *
 * - iterations: opcional en el body, número de operaciones (1–200). Default: 50.
 * - Las tareas creadas se identifican como "task:loadtest:<uuid>:<i>"
 *   y se les puede asociar un TTL para no ensuciar la DB.
 */
export const generateControlledLoad = async (req: Request, res: Response) => {
  try {
    const rawIterations = req.body?.iterations;
    let iterations = 50;

    if (typeof rawIterations === "number") {
      iterations = Math.min(Math.max(rawIterations, 1), 200);
    }

    const loadTestId = uuidv4();
    const pipeline = client.pipeline();

    for (let i = 0; i < iterations; i++) {
      const key = `task:loadtest:${loadTestId}:${i}`;
      const task = {
        id: `${loadTestId}-${i}`,
        title: `Tarea de carga controlada #${i + 1}`,
        status: "pendiente" as TaskStatus,
      };

      pipeline.hset(key, task);
      // Opcional: expirar estas tareas después de 10 minutos
      pipeline.expire(key, 600);
    }

    await pipeline.exec();

    res.status(201).json({
      message: "Carga controlada generada exitosamente.",
      iterations,
      loadTestId,
    });
  } catch (error) {
    console.error("Error al generar carga controlada:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
      error: (error as Error).message,
    });
  }
};
