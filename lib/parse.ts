import * as fs from "fs";
import * as readline from "readline";
import { parseOpenTelemetryJson, type CompletedCall } from "./telemetry";
import { SendMessage } from "./sendMessage";


export const parseCalls = async (filePath: string) : Promise<SendMessage[]> => {
    const calls = await parseTelemetry(filePath)
    return SendMessage.from(calls)
}

export const parseTelemetry = async (filePath: string) : Promise<CompletedCall[]> => {
    const lines = await readJsonLines(filePath)
    const calls = lines.flatMap((json) => parseOpenTelemetryJson(json))
    return calls
}

/**
 * Reads a JSONL file (where each line is a JSON object) and returns an array of parsed JSON objects.
 * @param filePath - The path to the JSONL file.
 * @returns A promise that resolves to an array of parsed JSON objects.
 */
async function readJsonLines(filePath: string): Promise<any[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity, // Recognize all instances of CR LF ('\r\n') as a single line break
  });

  const jsonObjects: any[] = [];

  for await (const line of rl) {
    try {
      if (line.trim().startsWith("{")) {
        const jsonObject = JSON.parse(line);
        jsonObjects.push(jsonObject);
      }
    } catch (error) {
      console.error(`Error parsing JSON from line: ${line}`, error);
    }
  }

  return jsonObjects;
}
