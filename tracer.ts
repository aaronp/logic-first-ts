
import { trace, Span, Tracer, SpanStatusCode } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BunyanInstrumentation } from '@opentelemetry/instrumentation-bunyan';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

// Initialize the tracer provider
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'bun-cli-app',
  }),
});

// Use OTLP exporter to export traces to a local file
const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces', // OTLP HTTP endpoint
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

// Register instrumentations
registerInstrumentations({
  instrumentations: [new BunyanInstrumentation()],
});

const tracer: Tracer = trace.getTracer('bun-cli-app');
/**
 * A utility function to wrap a block of code in an OpenTelemetry span.
 *
 * @param name - The name of the span.
 * @param args - An array of arguments to be added as attributes to the span.
 * @param thunk - A function to execute within the span.
 * @returns The result of the `thunk` function.
 */
export const traced = <T>(name: string, args: any[], thunk: () => T): T => {
  // Get the current tracer
  const tracer = trace.getTracer('traced-utility');

  // Start a new span
  return tracer.startActiveSpan(name, (span: Span) => {
    try {
      // Add arguments as attributes to the span
      args.forEach((arg, index) => {
        span.setAttribute(`arg${index}`, JSON.stringify(arg));
      });

      // Execute the thunk (the actual function to trace)
      const result = thunk();

      // Mark the span as successful
      span.setStatus({ code: SpanStatusCode.OK });

      // Return the result
      return result;
    } catch (error) {
      // Mark the span as failed and record the error
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);

      // Re-throw the error to propagate it
      throw error;
    } finally {
      // End the span
      span.end();
    }
  });
};