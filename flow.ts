import { Mermaid } from "./lib/mermaid";
import { PlantUML } from "./lib/plantUML";
import { parseTelemetry, parseCalls } from "./lib/parse";
import fs from 'fs'
import { C4 } from "./lib/c4";

// Main function
async function main() {
  const calls = await parseTelemetry("./traces.json")
  console.log(`${calls.length} calls: ${JSON.stringify(calls, null, 2)}`)

  const messages = await parseCalls("./traces.json")
  console.log(`\n${messages.length} messages: ${JSON.stringify(messages, null, 2)}`)

  const mermaidDiagram = new Mermaid(calls).asMermaid();
  fs.writeFileSync('mermaid.md', mermaidDiagram);


  const plant = new PlantUML(calls).diagram("App");
  fs.writeFileSync('plant.puml', plant);

  const c4 = new C4(calls).diagram();
  fs.writeFileSync('diagram.c4', c4);
}

// Run the main function
main().catch(console.error);