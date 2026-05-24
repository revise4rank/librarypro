import * as Sentry from "@sentry/node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { env } from "../config/env";

type MonitoringContext = Record<string, unknown>;

let initialized = false;
let otelSdk: NodeSDK | null = null;

function emitMonitoringLog(payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      ...payload,
    }),
  );
}

export function initializeMonitoring() {
  if (initialized) {
    return;
  }

  initialized = true;

  if (env.sentryDsn) {
    Sentry.init({
      dsn: env.sentryDsn,
      environment: env.appEnv,
      tracesSampleRate: 0.2,
      sendDefaultPii: false,
    });
  }

  if (env.otelExporterOtlpEndpoint) {
    otelSdk = new NodeSDK({
      serviceName: env.otelServiceName,
      traceExporter: new OTLPTraceExporter({
        url: env.otelExporterOtlpEndpoint,
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    });

    try {
      otelSdk.start();
    } catch (error) {
      emitMonitoringLog({
        level: "error",
        msg: "monitoring.otel_init_failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  emitMonitoringLog({
    msg: "monitoring.initialized",
    sentryEnabled: Boolean(env.sentryDsn),
    otelServiceName: env.otelServiceName,
    otelExporterConfigured: Boolean(env.otelExporterOtlpEndpoint),
  });
}

export function captureException(error: unknown, context: MonitoringContext = {}) {
  const normalized =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack ?? null,
        }
      : {
          name: "UnknownError",
          message: String(error),
          stack: null,
        };

  if (env.sentryDsn) {
    Sentry.withScope((scope) => {
      for (const [key, value] of Object.entries(context)) {
        scope.setContext(key, typeof value === "object" && value !== null ? (value as Record<string, unknown>) : { value });
      }
      Sentry.captureException(error);
    });
  }

  emitMonitoringLog({
    level: "error",
    msg: "monitoring.exception",
    sentryEnabled: Boolean(env.sentryDsn),
    otelServiceName: env.otelServiceName,
    error: normalized,
    context,
  });
}

export async function shutdownMonitoring() {
  if (otelSdk) {
    await otelSdk.shutdown().catch(() => undefined);
  }

  if (env.sentryDsn) {
    await Sentry.close(2000).catch(() => undefined);
  }
}
