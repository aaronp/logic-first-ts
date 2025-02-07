
import { trace, type Span, type Tracer, SpanStatusCode } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BunyanInstrumentation } from '@opentelemetry/instrumentation-bunyan';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

let _initialised = false
const init = () => {
    if (_initialised) {
        return 
    }
    console.log('initialising')
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
    console.log('initialised')
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
 * @param name - The name of the span.
 * @param args - An array of arguments to be added as attributes to the span.
 * @param thunk - A function to execute within the span.
 * @returns The result of the `thunk` function.
 */
export const traced = <T>(from : Container, to :Container, name: string, args: any[], thunk: () => T): T => {
  // Get the current tracer
  

  // Start a new span
  return tracer().startActiveSpan(name, (span: Span) => {
    try {
      // Add arguments as attributes to the span
      args.forEach((arg, index) => {
        span.setAttribute(`arg${index}`, typeof arg === 'string' ? arg : JSON.stringify(arg));
      });

      span.setAttribute('fromSystem', from.softwareSystem)
      span.setAttribute('fromLabel', from.label)
      span.setAttribute('fromType', from.type)
      from.tags.forEach((arg, index) => {
        span.setAttribute(`from-tag-${index}`, arg);
      });

      span.setAttribute('toSystem', to.softwareSystem)
      span.setAttribute('toLabel', to.label)
      span.setAttribute('toType', to.type)
      to.tags.forEach((arg, index) => {
        span.setAttribute(`to-tag-${index}`, arg);
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
      // End the span
      span.end();
    }
  });
};