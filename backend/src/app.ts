import express from "express";
import taskRoutes from "./routes/todoRoutes";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

app.use("/api", taskRoutes);

// Only start the server if this file is run directly
if (process.argv[1] && process.argv[1].endsWith("app.ts")) {
  const PORT = Number(process.env.PORT) || 3001;

  app.listen(PORT, () => {
    console.log("Server is listening on port", PORT);
  });
}

export default app;
