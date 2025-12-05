import type { NextFunction, Request, Response } from "express";
import client from "prom-client";

client.collectDefaultMetrics();

const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "route", "status_code"],
});

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route"],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

client.register.registerMetric(httpRequestCounter);
client.register.registerMetric(httpRequestDuration);

const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/api/metrics") {
    return next();
  }

  const end = httpRequestDuration.startTimer({
    method: req.method,
    route: req.route?.path || req.path,
  });

  res.on("finish", () => {
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: String(res.statusCode),
    };

    httpRequestCounter.inc(labels);
    end();
  });

  next();
};

export default metricsMiddleware;
