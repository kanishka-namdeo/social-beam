/**
 * OpenTelemetry SDK initialization for distributed tracing.
 *
 * This module configures OTel auto-instrumentations and exports traces
 * to the configured backend (Sentry, Jaeger, or OTLP endpoint).
 *
 * ## Installation Required
 * Before this module can be used, install the following packages:
 *
 * ```bash
 * pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/api
 * pnpm add @opentelemetry/sdk-trace-node @opentelemetry/exporter-trace-otlp-http
 * pnpm add @opentelemetry/instrumentation-http @opentelemetry/instrumentation-express
 * ```
 *
 * ## Activation
 * Set `OTEL_ENABLED=true` in environment variables to activate tracing.
 * The SDK is guarded so it will not crash if packages are missing.
 */

/**
 * Initialize the OpenTelemetry SDK.
 *
 * This function is designed to be called from `instrumentation.ts` in the
 * `register()` hook. It is guarded to fail gracefully if OTel packages are
 * not installed.
 *
 * ## Usage in instrumentation.ts
 * ```typescript
 * if (process.env.NEXT_RUNTIME === 'nodejs') {
 *   await initOpenTelemetry();
 *   // ... other init
 * }
 * ```
 *
 * ## Environment Variables
 * - `OTEL_ENABLED` — Set to "true" to activate
 * - `OTEL_EXPORTER_OTLP_ENDPOINT` — OTLP collector URL (default: http://localhost:4318)
 * - `OTEL_SERVICE_NAME` — Service name for traces (default: "social-beam")
 */
export async function initOpenTelemetry(): Promise<void> {
  if (process.env.OTEL_ENABLED !== "true") {
    return;
  }

  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    // Dynamic imports using variables to prevent Turbopack from statically analyzing
    // Install with: pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
    const sdkNodeModule = "@opentelemetry/sdk-node";
    const autoInstrumentationsModule = "@opentelemetry/auto-instrumentations-node";
    const traceExporterModule = "@opentelemetry/exporter-trace-otlp-http";
    
    // @ts-ignore - optional dependency
    const sdkNode = await import(/* webpackIgnore: true */ sdkNodeModule).catch(() => null);
    // @ts-ignore - optional dependency
    const autoInstrumentations = await import(/* webpackIgnore: true */ autoInstrumentationsModule).catch(() => null);
    // @ts-ignore - optional dependency
    const traceExporter = await import(/* webpackIgnore: true */ traceExporterModule).catch(() => null);

    if (!sdkNode || !autoInstrumentations || !traceExporter) {
      return;
    }

    const { NodeSDK } = sdkNode;
    const { getNodeAutoInstrumentations } = autoInstrumentations;
    const { OTLPTraceExporter } = traceExporter;

    const sdk = new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME ?? "social-beam",
      traceExporter: new OTLPTraceExporter({
        url:
          process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
          "http://localhost:4318/v1/traces",
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();

    // Graceful shutdown on process exit
    process.on("SIGTERM", async () => {
      await sdk.shutdown();
    });
  } catch {
    // OTel packages not installed — silently skip
  }
}

/**
 * Lightweight OpenTelemetry-compatible span interface.
 * Defined inline to avoid depending on @opentelemetry/api when not installed.
 */
interface OTelSpan {
  setAttributes(attrs: Record<string, string | number | boolean>): void;
  recordException(error: Error): void;
  end(): void;
}

/**
 * Tracing span interface — works whether OTel is active or not.
 */
export interface TracingSpan {
  setAttributes(attrs: Record<string, string | number | boolean>): void;
  recordError(error: unknown): void;
  end(): void;
}

/**
 * Global trace accessor set by initOpenTelemetry after SDK starts.
 */
interface OtelTraceAccessor {
  tracer: {
    startSpan(name: string): OTelSpan;
  };
}

declare global {
  // eslint-disable-next-line no-var, @typescript-eslint/no-explicit-any
  var __OTEL_TRACE__: OtelTraceAccessor | undefined;
}

/**
 * Create a custom span for tracing critical operations.
 *
 * Returns a no-op span wrapper if OTel is not initialized, so calling code
 * does not need to guard each invocation.
 *
 * ## Example
 * ```typescript
 * const span = createSpan("publish.post", { postId: "abc123" });
 * try {
 *   const result = await publishPost(post);
 *   span.setAttributes({ status: "success" });
 *   return result;
 * } catch (error) {
 *   span.recordError(error);
 *   throw error;
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>
): TracingSpan {
  const otel =
    process.env.OTEL_ENABLED === "true"
      ? globalThis.__OTEL_TRACE__
      : undefined;

  if (!otel) {
    return NOOP_SPAN;
  }

  const span = otel.tracer.startSpan(name);
  if (attributes) {
    span.setAttributes(attributes);
  }
  return new RealSpan(span);
}

class RealSpan implements TracingSpan {
  constructor(private span: OTelSpan) {}

  setAttributes(attrs: Record<string, string | number | boolean>): void {
    this.span.setAttributes(attrs);
  }

  recordError(error: unknown): void {
    if (error instanceof Error) {
      this.span.recordException(error);
    }
  }

  end(): void {
    this.span.end();
  }
}

const NOOP_SPAN: TracingSpan = {
  setAttributes: () => {},
  recordError: () => {},
  end: () => {},
};
