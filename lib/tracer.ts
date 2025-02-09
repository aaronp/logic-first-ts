
import { trace, type Span, type Tracer, SpanStatusCode } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BunyanInstrumentation } from '@opentelemetry/instrumentation-bunyan';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import type { Container } from './telemetry';
import { AtomicCounter } from './callId';

let _initialised = false
const init = () => {
    if (_initialised) {
        return 
    }
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
    _initialised = true
}
let _tracerCached: Tracer | null = null


const tracer = () : Tracer => {
    if (_tracerCached) {
        return _tracerCached
    }
    init()
    _tracerCached = trace.getTracer('bun-cli-app');
    return _tracerCached
}

/**
 * A utility function to wrap a block of code in an OpenTelemetry span.
 *
 * @param name - The name of the span operation.
 * @param args - An array of arguments to be added as attributes to the span.
 * @param thunk - A function to execute within the span.
 * @returns The result of the `thunk` function.
 */
export const traceSpan = <T>(from : Container, to :Container, name: string, args: any[], thunk: () => T): T => {
  
  // Start a new span
  return tracer().startActiveSpan(name, (span: Span) => {
    const callId = AtomicCounter.getInstance().increment()
    try {
      // Add arguments as attributes to the span
      args.forEach((arg, index) => {
        span.setAttribute(`arg${index}`, typeof arg === 'string' ? arg : JSON.stringify(arg));
      });

      span.setAttribute('fromSystem', from.softwareSystem)
      span.setAttribute('fromLabel', from.label)
      span.setAttribute('fromType', from.type)
      span.setAttribute('callId', callId);
      Array.from(from.tags).forEach((arg, index) => {
        span.setAttribute(`from-tag-${index}`, JSON.stringify(arg));
      });

      span.setAttribute('toSystem', to.softwareSystem)
      span.setAttribute('toLabel', to.label)
      span.setAttribute('toType', to.type)
      Array.from(to.tags).forEach((arg, index) => {
        span.setAttribute(`to-tag-${index}`, JSON.stringify(arg));
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
        message: `${error}`,
      });
      span.recordException(`${error}`);

      // Re-throw the error to propagate it
      throw error;
    } finally {
      span.end();
    }
  });
};