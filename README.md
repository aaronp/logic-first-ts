# logic-first

This project produces a 'logic-first' library used to add particular open-telemetry instrumentation to your application 
in order to generate architecture diagrams (e.g. C4 or mermaid/planuml sequence diagrams) from your code.

# About
"Logic-First" is about generating your diagrams from your code, you:
 * eliminate drift. You don't have to answer "does the software do what the diagram says it's doing?" because if your code changes, your diagrams change
 * easily covers non-happy path scenarios. E.g. what does the software do when operations fail?
 * makes keeping accurate documentation easier - you 'get it for free'

# Examples

see the ./example directory in this repo

# Releases
 * [0.0.3](./releases/0-0-3.md) 
 * [0.0.2](./releases/0-0-2.md) 
 * [0.0.1](./releases/0-0-1.md)

# Usage

Using this library consists of two parts:
 * instrumenting your application calls
 * parsing the open telemetry files from running your application to produce useful diagrams


## Instrumentation

Use e.g. `bun add logic-first` to add this library to your app, and then use the 'traceSpan' function to instrument calls between various elements of your application:

```typescript
async function googleSearch(query: string) {
  // this is the metadata/information which is captured in our instrumentation
  const from = newSystem("myapp", "query-service")
  const to = newSystem("google", "search")
  const operation = "googleSearch"
  const args = [query]

  // the 'traceSpan' wraps some compute function with the above metadata
  const searchResults = await traceSpan(from, to, operation, args, async () => {
    const response = await fetch(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response
  });

  return searchResults
}
```


## Running your instrumented app

Your app, when run, will send telemetry which you can collect using something like:
```sh
touch traces.json
docker run \
  -v $(pwd)/config.yaml:/etc/otelcol-contrib/config.yaml \
  -v $(pwd)/traces.json:/traces.json \
  -p 4317:4317 \
  -p 4318:4318 \
  otel/opentelemetry-collector-contrib:0.118.0
```

Assuming this local 'config.yaml':
```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: "0.0.0.0:4318"

processors:
  batch:

exporters:
  file:
    path: ./traces.json

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [file]
```

When run, those calls will send that instrumentation using opentelemetry, which can be configured to write to a file.

## Generating architecure diagrams

All being well, you will have a `traces.json` file which contains a trace of whatever your app did.

You can then use this file to produce plantUML diagrams, mermaid diagrams, c4 diagrams, whateves by using the 'LogicFirst' utility:

```sh
import { LogicFirst } from 'logic-first'
import fs from 'fs'

async function main() {
  const logicFirst = await LogicFirst.fromOpenTelemetryFile("./traces.json")

  const mermaidDiagram = logicFirst.mermaid.markdown();
  fs.writeFileSync('mermaid.md', mermaidDiagram);

  const plant = logicFirst.plantUML.diagram("App");
  fs.writeFileSync('plant.puml', plant);

  const c4 = logicFirst.c4.diagram();
  fs.writeFileSync('diagram.c4', c4);
}

// Run the main function
main().catch(console.error);
```