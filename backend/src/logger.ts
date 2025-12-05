import pino from "pino";

const level = process.env.LOG_LEVEL || "info";

const logger = pino({
  level,
  enabled: process.env.NODE_ENV !== "test",
  base: {
    service: "backend",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export default logger;
