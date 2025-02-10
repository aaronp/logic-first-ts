import { Tracer, newPerson, newSystem } from "logic-first";
import fs from 'fs'

const person = newPerson('app', 'dave')
const sys = newSystem('app', 'parser')
const goog = newSystem('app', 'google')

// Function to perform a Google search
async function googleSearch(query: string) {
  const span = await Tracer.instance().trace(sys, goog, 'googleSearch', [query], async () => {
    const response = await fetch(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response
  });

  return span
}


// Function to parse user input and split it into words
async function parseInput(input: string) {
  return await Tracer.instance().trace(person, sys, 'parse', [input], async () => await googleSearch(input));
}

// Main function
async function main() {

    // Prompt the user for input
    const input = prompt('Enter a sentence to search: ');
    if (!input) {
      throw new Error('No input provided');
    }

    // Parse the input
    const words = await parseInput(input);

    console.log('got: ' + JSON.stringify(words, null, 2))

    const logicFirst = Tracer.instance().logicFirst()
    const mermaidDiagram = logicFirst.mermaid.markdown();
    fs.writeFileSync('mermaid.md', mermaidDiagram);
  
    const plant = logicFirst.plantUML.diagram("App");
    fs.writeFileSync('plant.puml', plant);
  
    const c4 = logicFirst.c4.diagram();
    fs.writeFileSync('diagram.c4', c4);
}

// Run the main function
main().catch(console.error);