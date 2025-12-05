import type { NextFunction, Request, Response } from "express";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { trace } from "@opentelemetry/api";
import logger from "../logger";

const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const headerId = req.headers["x-request-id"];
    const requestId = Array.isArray(headerId)
      ? headerId[0]
      : typeof headerId === "string" && headerId.length > 0
        ? headerId
        : randomUUID();

    res.setHeader("x-request-id", requestId);
    return requestId;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) {
      return "error";
    }
    if (res.statusCode >= 400) {
      return "warn";
    }
    return "info";
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        route: req.route?.path,
        query: req.query,
        params: req.params,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customProps: (req, res) => {
    const span = trace.getActiveSpan();
    const props: Record<string, unknown> = {
      requestId: req.id,
      responseTimeMs: res.getHeader("x-response-time"),
    };

    if (span) {
      const spanContext = span.spanContext();
      props.traceId = spanContext.traceId;
      props.spanId = spanContext.spanId;
    }

    return props;
  },
});

const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  httpLogger(req, res);

  if (req.id) {
    res.setHeader("x-request-id", String(req.id));
  }

  next();
};

export default loggingMiddleware;
