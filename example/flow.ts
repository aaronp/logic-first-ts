import { LogicFirst } from 'logic-first'
import fs from 'fs'

// Main function
async function main() {
  const logicFirst = await LogicFirst.fromOpenTelemetryFile("./traces.json")

  const mermaidDiagram = logicFirst.mermaid.diagram();
  fs.writeFileSync('diagram.md', mermaidDiagram);

  const plant = logicFirst.plantUML.diagram("App");
  fs.writeFileSync('diagram.puml', plant);

  const c4 = logicFirst.c4.diagram();
  fs.writeFileSync('workspace.dsl', c4);
}

// Run the main function
main().catch(console.error);

