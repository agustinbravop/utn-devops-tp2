import process from "node:process";

import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";

const SERVICE_NAME = "backend";
const DEFAULT_COLLECTOR_URL = "http://localhost:4318/v1/traces";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    "service.name": SERVICE_NAME,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || DEFAULT_COLLECTOR_URL,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

let started = false;

const shutdown = async () => {
  if (!started) {
    return;
  }

  started = false;

  try {
    await sdk.shutdown();
  } catch (error) {
    console.error("Failed to shutdown OpenTelemetry tracing", error);
  }
};

export const startTracing = async () => {
  if (started || process.env.NODE_ENV === "test") {
    return;
  }

  try {
    await sdk.start();
    started = true;
  } catch (error) {
    console.error("Failed to start OpenTelemetry tracing", error);
    return;
  }

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
};

export const stopTracing = shutdown;

export default sdk;
