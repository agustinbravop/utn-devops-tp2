import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import {
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  testear,
} from "../controllers/todoController";
import { triggerLoadTest } from "../controllers/loadTestController";

const router = Router();
const tracer = trace.getTracer("backend");

// Middleware para envolver controladores con tracing.
const withTracing = (
  operationName: string,
  controller: (req: Request, res: Response) => Promise<unknown> | unknown,
): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const span = tracer.startSpan(operationName);

    try {
      // Añadir atributos de la request
      span.setAttribute("http.method", req.method);
      span.setAttribute("http.route", req.route?.path || req.path);
      span.setAttribute("http.url", req.url);

      // Añadir parámetros de ruta si existen
      if (req.params.id) {
        span.setAttribute("task.id", req.params.id);
      }

      // Añadir información del body para POST/PUT
      if (req.body) {
        if (req.body.title) {
          span.setAttribute("task.title", req.body.title);
        }
        if (req.body.status) {
          span.setAttribute("task.status", req.body.status);
        }
        if (req.body.intensity) {
          span.setAttribute("load.intensity", Number(req.body.intensity));
        }
      }

      // Ejecutar el controlador
      await controller(req, res);

      // Registrar el status code de la respuesta
      span.setAttribute("http.status_code", res.statusCode);

      // Marcar como éxito si el status es 2xx o 3xx
      if (res.statusCode >= 200 && res.statusCode < 400) {
        span.setStatus({ code: SpanStatusCode.OK });
      } else {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }
    } catch (error) {
      // Registrar el error en el span
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });

      // Re-lanzar el error para que el error handler de Express lo maneje
      next(error);
    } finally {
      // Siempre finalizar el span
      span.end();
    }
  };
};

// Rutas con tracing
router.get("/tasks", withTracing("get-all-tasks", getTasks));
router.post("/tasks", withTracing("create-task", createTask));
router.put("/tasks/:id", withTracing("update-task-status", updateTaskStatus));
router.delete("/tasks/:id", withTracing("delete-task", deleteTask));
router.post("/test", withTracing("test-endpoint", testear));
router.post("/load-test", withTracing("run-load-test", triggerLoadTest));

export default router;
