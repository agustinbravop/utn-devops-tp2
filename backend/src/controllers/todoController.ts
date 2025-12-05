import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import Redis from "ioredis";

import logger from "../logger";

let client = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export const setRedisClient = (redis: Redis) => {
  client = redis;
};

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
    logger.error({ err: error }, "Error al obtener tareas");
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
    logger.error({ err: error, body: req.body }, "Error al crear la tarea");
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
    logger.error(
      { err: error, params: req.params },
      "Error al actualizar la tarea",
    );
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
    logger.error(
      { err: error, params: req.params },
      "Error al eliminar la tarea",
    );
    res.status(500).json({ message: "Error interno del servidor.", error });
  }
};

export const testear = async (req: Request, res: Response) => {
  const { num1, num2 } = req.body;
  try {
    const result = num1 + num2;
    res.status(200).json(result);
  } catch (error) {
    logger.error({ err: error, body: req.body }, "Error en testear");
    return res.status(500).json({ message: error });
  }
};
