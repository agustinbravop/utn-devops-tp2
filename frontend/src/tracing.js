import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";
import { W3CTraceContextPropagator } from "@opentelemetry/core";

export const initTracing = () => {
  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "frontend-app",
    }),
  });

  // Configurar el exportador OTLP para enviar trazas a Tempo
  const exporter = new OTLPTraceExporter({
    url:
      import.meta.env.VITE_OTEL_ENDPOINT || "http://localhost:4318/v1/traces",
  });

  // Usar BatchSpanProcessor para mejor rendimiento
  // Agrupa múltiples spans antes de enviarlos
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));

  // Configurar el context manager y propagador
  provider.register({
    contextManager: new ZoneContextManager(),
    propagator: new W3CTraceContextPropagator(),
  });

  // Obtener la URL de la API desde variables de entorno
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // Extraer el origen (protocolo + dominio + puerto) de la URL
  let apiOrigin;
  try {
    apiOrigin = new URL(apiUrl).origin;
  } catch {
    // Si apiUrl no es una URL completa, asumir que es solo el path
    apiOrigin = "http://localhost:3001";
  }

  // Registrar instrumentaciones automáticas
  registerInstrumentations({
    instrumentations: [
      // Instrumentación para fetch API
      new FetchInstrumentation({
        // Configurar propagación de headers de traza
        propagateTraceHeaderCorsUrls: [
          new RegExp(apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
          /localhost:3001/,
        ],
        clearTimingResources: true,
        // Añadir atributos personalizados a cada span
        applyCustomAttributesOnSpan: (span, request, response) => {
          span.setAttribute("http.url", request.url);
          if (response) {
            span.setAttribute("http.status_code", response.status);
          }
        },
      }),
      // Instrumentación para XMLHttpRequest (usado por axios)
      new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls: [
          new RegExp(apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
          /localhost:3001/,
        ],
      }),
    ],
  });

  console.log("✅ OpenTelemetry tracing initialized for Task Manager Frontend");
  console.log(`📡 Sending traces to: ${exporter.url}`);
  console.log(`🔗 Propagating context to: ${apiOrigin}`);

  return provider;
};

export default initTracing;
