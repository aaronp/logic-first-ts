import { AtomicCounter } from "./callId";
import { LogicFirst } from "./logicFirst";
import type {
  CallResponse,
  CallSite,
  CompletedCall,
  Container,
} from "./telemetry";

function getTimestampInNanoseconds(): bigint {
  const time = process.hrtime(); // Returns [seconds, nanoseconds]
  const secondsAsNanoseconds = BigInt(time[0]) * BigInt(1e9); // Convert seconds to nanoseconds
  const nanoseconds = BigInt(time[1]); // Add the nanoseconds part
  return secondsAsNanoseconds + nanoseconds;
}

export class Tracer {
  private completedCalls: CompletedCall[] = [];

  private static _instance: Tracer | null = null;

  public static instance(): Tracer {
    if (!Tracer._instance) {
      Tracer._instance = new Tracer();
    }
    return Tracer._instance;
  }

  // Function to trace a block of code
  public async trace<T>(
    from: Container,
    to: Container,
    name: string,
    args: any[],
    thunk: () => Promise<T>,
    formatResult?: (result: T) => string
  ): Promise<T> {
    const callId = AtomicCounter.getInstance().increment();
    const invocationTimestamp = getTimestampInNanoseconds();

    // Create the CallSite
    const callSite: CallSite = {
      action: {
        source: from,
        target: to,
        operation: name,
      },
      inputs: args,
      timestamp: invocationTimestamp,
    };

    let result: T;

    try {
      // Execute the thunk (the block of code to be traced)
      const value = thunk();
      result = value instanceof Promise ? await value : value;

      const resultComment = formatResult
        ? formatResult(result)
        : JSON.stringify(result);

      // If successful, create a "Completed" response
      const response: CallResponse = {
        type: "Completed",
        operationId: callId,
        timestamp: getTimestampInNanoseconds(),
        result: resultComment,
      };

      this.addCall(callId, callSite, response);
    } catch (error) {
      // If an error occurs, create an "Error" response
      const response: CallResponse = {
        type: "Error",
        operationId: callId,
        timestamp: getTimestampInNanoseconds(),
        bang: error,
      };
      this.addCall(callId, callSite, response);

      // Re-throw the error after recording it
      throw error;
    }

    return result;
  }

  addCall(callId: number, invocation: CallSite, response: CallResponse) {
    // Create the CompletedCall object
    const completedCall: CompletedCall = {
      callId,
      responseId: AtomicCounter.getInstance().increment(),
      invocation,
      response,
    };

    // Add the CompletedCall to the list
    this.completedCalls.push(completedCall);
  }

  // Function to get all completed calls
  public logicFirst(): LogicFirst {
    return new LogicFirst(this.completedCalls);
  }

  // Function to clear all completed calls
  public clearCompletedCalls(): void {
    this.completedCalls = [];
  }
}
