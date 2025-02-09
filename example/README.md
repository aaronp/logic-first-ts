# An example for using the 'logic-first' library

You use `make listen` to start the open-telemetry listener, 
then `make run` to run the app, which should create a `./traces.json` file locally.

Then you can run `make diagram` to create local plantuml, mermaid, and c4 diagrams from that app.

To see their output beyond that markup form, you can:

Create a png from the planUML:
```bash
docker run --rm -v $(pwd):/workspace plantuml/plantuml -tpng /workspace/diagram.puml
```

Create a png from the mermaid:
```bash
docker run --rm -v $(pwd):/workspace minlag/mermaid-cli mmdc -i /workspace/diagram.md -o /workspace/diagram.png

// or use a live editor:
docker run -d -p 8000:8000 ghcr.io/mermaid-js/mermaid-live-editor
```

Open the c4 diagram using structurizr:
```sh
docker run --rm -it -p 8080:8080 -v $(pwd):/usr/local/structurizr structurizr/lite
// or, if you're running ARM like me:
docker run --rm -it --platform=linux/amd64 -p 8080:8080 -v $(pwd):/usr/local/structurizr structurizr/lite

```
