import { Request, Response } from "express";
import { Worker } from "node:worker_threads";
import logger from "../logger";

const DEFAULT_INTENSITY = 50;
const MAX_INTENSITY = 100;
const MIN_INTENSITY = 1;
const LOAD_TEST_DURATION_SECONDS = 60;

const clampIntensity = (value: unknown): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return DEFAULT_INTENSITY;
  }

  if (parsed < MIN_INTENSITY) {
    return MIN_INTENSITY;
  }

  if (parsed > MAX_INTENSITY) {
    return MAX_INTENSITY;
  }

  return Math.round(parsed);
};

// Spin worker so it doesn't block the main thread.
const spinWorker = (intensity: number) => {
  const workerScript = `
    const { parentPort, workerData } = require('worker_threads');

    const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

    const runLoad = (intensity, durationSeconds) => {
      const iterations = intensity * 500000;
      const memoryBytes = intensity * 5 * 1024 * 1024;
      const memory = Buffer.alloc(memoryBytes, 1);
      const stopAt = Date.now() + durationSeconds * 1000;
      let acc = 0;

      while (Date.now() < stopAt) {
        const burstUntil = Date.now() + 500;
        while (Date.now() < burstUntil) {
          for (let i = 0; i < iterations; i += 1) {
            acc += Math.sqrt((i ^ acc) & 0xff) || 1;
          }
          memory.fill(acc & 0xff);
        }

        const elapsedRatio = (Date.now() - (stopAt - durationSeconds * 1000)) / (durationSeconds * 1000);
        const throttleMs = Math.max(5, 20 - Math.floor(elapsedRatio * 10));
        sleep(throttleMs);
      }

      memory.fill(0);
    };

    try {
      runLoad(workerData.intensity, workerData.durationSeconds);
      parentPort?.postMessage({ status: 'completed' });
    } catch (error) {
      parentPort?.postMessage({ status: 'failed', error: error.message });
      throw error;
    }
  `;

  const worker = new Worker(workerScript, {
    eval: true,
    workerData: { intensity, durationSeconds: LOAD_TEST_DURATION_SECONDS },
  });

  worker.unref();

  worker.on("error", (error) => {
    logger.error({ err: error, intensity }, "Load test worker error");
  });
};

export const triggerLoadTest = (req: Request, res: Response) => {
  const intensity = clampIntensity(req.body?.intensity);

  logger.info({ body: req.body, intensity }, "Triggering load test");
  spinWorker(intensity);

  res.status(202).json({
    status: "started",
    intensity,
    durationSeconds: LOAD_TEST_DURATION_SECONDS,
  });
};
