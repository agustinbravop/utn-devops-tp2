import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";

const SERVICE_NAME = "frontend";
const DEFAULT_API_URL = "http://localhost:3001";
const DEFAULT_COLLECTOR_URL = "http://localhost:4318/v1/traces";

let provider;

const resolveCollectorUrl = () =>
  import.meta.env.VITE_OTEL_ENDPOINT || DEFAULT_COLLECTOR_URL;

const resolveApiOrigin = () => {
  const apiUrl = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

  try {
    return new URL(apiUrl).origin;
  } catch {
    return DEFAULT_API_URL;
  }
};

const createInstrumentations = (originRegex) => [
  new FetchInstrumentation({
    propagateTraceHeaderCorsUrls: [originRegex],
  }),
  new XMLHttpRequestInstrumentation({
    propagateTraceHeaderCorsUrls: [originRegex],
  }),
];

export const initTracing = () => {
  if (typeof window === "undefined") {
    diag.debug("[otel] Skipping web tracing init (non-browser environment)");
    return undefined;
  }

  if (provider) {
    diag.debug("[otel] Web tracing already initialized");
    return provider;
  }

  const collectorUrl = resolveCollectorUrl();
  const apiOrigin = resolveApiOrigin();
  const originRegex = new RegExp(
    apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      "service.name": SERVICE_NAME,
    }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: collectorUrl,
        }),
      ),
    ],
  });

  provider.register({
    contextManager: new ZoneContextManager(),
    propagator: new W3CTraceContextPropagator(),
  });

  registerInstrumentations({
    instrumentations: createInstrumentations(originRegex),
  });

  diag.info(
    `[otel] Frontend tracing initialized (service=${SERVICE_NAME}, endpoint=${collectorUrl})`,
  );

  return provider;
};

export const shutdownTracing = async () => {
  if (!provider) {
    return;
  }

  try {
    await provider.shutdown();
    diag.info("[otel] Frontend tracing shut down");
  } catch (error) {
    diag.error("[otel] Failed to shut down web tracing", error);
  } finally {
    provider = undefined;
  }
};

export default initTracing;
