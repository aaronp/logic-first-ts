import { Mermaid } from "./lib/mermaid";
import { parseTelemetry, parseCalls } from "./lib/parse";
import fs from 'fs'

// Main function
async function main() {
  const calls = await parseTelemetry("./traces.json")
  console.log(`${calls.length} calls: ${JSON.stringify(calls, null, 2)}`)

  const messages = await parseCalls("./traces.json")
  console.log(`\n${messages.length} messages: ${JSON.stringify(messages, null, 2)}`)

  const mermaidDiagram = new Mermaid(calls).asMermaid();
  fs.writeFileSync('mermaid.md', mermaidDiagram);


  const plant = new Mermaid(calls).asMermaid();
  fs.writeFileSync('plant.puml', mermaidDiagram);
}

// Run the main function
main().catch(console.error);