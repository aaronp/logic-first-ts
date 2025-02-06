import { newPerson, newSystem, traced } from "./tracer";


const person = newPerson('app', 'dave')
const sys = newSystem('app', 'parser')
const goog = newSystem('app', 'google')

// Function to perform a Google search
async function googleSearch(query: string) {
  const span = await traced(sys, goog, 'googleSearch', [query], async () => {
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
  return await traced(person, sys, 'parse', [input], async () => await googleSearch(input));
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
}

// Run the main function
main().catch(console.error);