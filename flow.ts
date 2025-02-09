import { LogicFirst } from './lib/logicFirst'
import fs from 'fs'

// Main function
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

