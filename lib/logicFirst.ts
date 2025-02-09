import { C4 } from "./c4";
import { Mermaid } from "./mermaid";
import { parseTelemetry } from "./parse";
import { PlantUML } from "./plantUML";
import type { CompletedCall } from "./telemetry";

/**
 * Wraps parsed telemetry data as 'CompletedCall's, which can then be represented as C4, Mermaid, PlantUML, etc docs
 */
export class LogicFirst {
    private calls: CompletedCall[];
  
    constructor(calls: CompletedCall[]) {
      this.calls = calls;
    }
  
    /**
     * Static factory method to create a `LogicFirst` instance from an OpenTelemetry file.
     * 
     * ## Generating an OpenTelemetry File
     * To produce such a file, ensure your project has a `config.yaml` file similar to the following:
     * 
     * ```yaml
     * receivers:
     *   otlp:
     *     protocols:
     *       http:
     *         endpoint: "0.0.0.0:4318"
     * 
     * processors:
     *   batch:
     * 
     * exporters:
     *   file:
     *     path: ./traces.json
     * 
     * service:
     *   pipelines:
     *     traces:
     *       receivers: [otlp]
     *       processors: [batch]
     *       exporters: [file]
     * ```
     * Which can then be run via docker by:
     * ```sh
     * touch traces.json
     * docker run \
     * -v $(pwd)/config.yaml:/etc/otelcol-contrib/config.yaml \
     * -v $(pwd)/traces.json:/traces.json \
     * -p 4317:4317 \
     * -p 4318:4318 \
     * otel/opentelemetry-collector-contrib:0.118.0
     * ```
     * 
     * With that set up, your local app will send its telemetry data by putting 'traceSpan' around system calls between various actors of the system:
     * ```
     * traceSpan(<from>, <from>, <operation name>, <args>, async () => ... thunk ...)
     * ```
     *
     * 
     * @param file - The path to the OpenTelemetry JSON file, which contains one JSON entry per line.
     * @returns A new instance of `LogicFirst` initialized with data from the provided file.
     */

    public static async fromOpenTelemetryFile(file: string): Promise<LogicFirst> {
      const calls = await parseTelemetry(file)

    //   SendMessage.from(calls)

      return new LogicFirst(calls);
    }
  
    /**
     * Converts the logic to a C4 model representation.
     */
    public get c4() : C4 {
        return  new C4(this.calls);
    }

    public get plantUML() : PlantUML {
        return new PlantUML(this.calls);
    }
    public get mermaid() : Mermaid {
        return new Mermaid(this.calls);
    }
  }
  