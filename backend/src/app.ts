import { startTracing } from "./tracing";
startTracing();

import express from "express";
import cors from "cors";
import taskRoutes from "./routes/todoRoutes";
import dotenv from "dotenv";
import client from "prom-client";
import metricsMiddleware from "./middleware/metricsMiddleware";
import { trace } from "@opentelemetry/api";

const app = express();
const tracer = trace.getTracer("backend");

// Middlewares.
app.use(cors());
app.use(express.json());

// Middleware para añadir información de traza a cada request.
app.use((req, _res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute("http.route", req.path);
    span.setAttribute("http.method", req.method);
    span.setAttribute("app.name", "backend");
  }
  next();
});

app.use(metricsMiddleware);

// Prometheus metrics endpoint.
app.get("/api/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// Health check endpoint con tracing.
app.get("/api/health", (_req, res) => {
  const span = tracer.startSpan("health-check");
  try {
    span.setAttribute("health.status", "ok");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "task-manager-backend",
    });
  } finally {
    span.end();
  }
});

app.use("/api", taskRoutes);

// Only start the server if this file is run directly.
if (process.argv[1] && process.argv[1].endsWith("app.ts")) {
  // read from .env file
  dotenv.config();
  const PORT = Number(process.env.PORT) || 3001;
  app.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
  });
}

export default app;
