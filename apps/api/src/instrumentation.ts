import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ParentBasedSampler, SamplingDecision } from "@opentelemetry/sdk-trace-base";

import { env } from "~/config/env.config";

/**
 * Export traces to our own OpenTelemetry collector. The OTLP exporter reads
 * `OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_EXPORTER_OTLP_HEADERS` from the environment. Only start the
 * SDK when a collector endpoint is configured, so this is a no-op in local development and CI.
 */
if (env.OTEL_EXPORTER_OTLP_ENDPOINT != null) {
	const sdk = new NodeSDK({
		serviceName: "dariah-knowledge-base-api",
		traceExporter: new OTLPTraceExporter(),
		instrumentations: [new HttpInstrumentation()],
		/**
		 * Drop traces for the `/health` endpoint (frequent, no signal). At sampling time the incoming
		 * request span carries the request path in `url.path` / `http.target` (`http.route` is only set
		 * later, once the route is matched). `ParentBasedSampler` makes child spans follow the root
		 * decision.
		 */
		sampler: new ParentBasedSampler({
			root: {
				shouldSample(_context, _traceId, _spanName, _spanKind, attributes) {
					const path = attributes["url.path"] ?? attributes["http.target"];
					const isHealthCheck = typeof path === "string" && path.split("?", 1)[0] === "/health";
					return {
						decision: isHealthCheck
							? SamplingDecision.NOT_RECORD
							: SamplingDecision.RECORD_AND_SAMPLED,
					};
				},
			},
		}),
	});

	sdk.start();

	process.on("SIGTERM", () => {
		void sdk.shutdown().finally(() => {
			process.exit(0);
		});
	});
}
