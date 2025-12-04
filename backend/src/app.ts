import express from "express";
import taskRoutes from "./routes/todoRoutes";
import cors from "cors";
import dotenv from "dotenv";
import client from "prom-client";
import metricsMiddleware from "./middleware/metricsMiddleware";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.use("/api", taskRoutes);

// Only start the server if this file is run directly
if (process.argv[1] && process.argv[1].endsWith("app.ts")) {
  // read from .env file
  dotenv.config();
  const PORT = Number(process.env.PORT) || 3001;

  app.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
  });
}

export default app;
