import dotenv from "dotenv";
import client from "prom-client";
import metricsMiddleware from "./middleware/metricsMiddleware";
import express from "express";
import cors from "cors";
import taskRoutes from "./routes/todoRoutes";

const app = express();

// Middlewares.
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// Prometheus metrics endpoint.
app.get("/api/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.use("/api", taskRoutes);

// Solo iniciar el servidor si este archivo se ejecuta directamente.
if (process.argv[1] && /app\.(ts|js)$/.test(process.argv[1])) {
  // read from .env file.
  dotenv.config();
  const PORT = Number(process.env.PORT) || 3001;

  app.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
  });
}

export default app;
