import { parseTelemetry } from "./lib/parse";

// Main function
async function main() {
  const calls = await parseTelemetry("./traces.json")
  console.log(`${calls.length} calles: ${JSON.stringify(calls, null, 2)}`)
}

// Run the main function
main().catch(console.error);