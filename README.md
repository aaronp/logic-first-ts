# logic-first

This project produces a 'logic-first' library used to add particular open-telemetry instrumentation to your application 
in order to generate architecture diagrams (e.g. C4 or mermaid/planuml sequence diagrams) from your code.

## Why?
By generating your diagrams from your code, you:
 * eliminate drift. You don't have to answer "does the software do what the diagram says it's doing?" because if your code changes, your diagrams change
 * easily covers non-happy path scenarios. E.g. what does the software do when operations fail?
 * makes keeping accurate documentation easier - you 'get it for free'

## Usage
