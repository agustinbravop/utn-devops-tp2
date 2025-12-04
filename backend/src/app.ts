import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import taskRoutes from "./routes/todoRoutes";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api", taskRoutes);

// Solo iniciar el servidor si este archivo se ejecuta directamente
if (process.argv[1] && /app\.(ts|js)$/.test(process.argv[1])) {
  const PORT = Number(process.env.PORT) || 3001;

  app.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
  });
}

export default app;
