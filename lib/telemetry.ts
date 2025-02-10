
export type ContainerType = "System" | "Database" | "Job" | "Person"

// epoch in nanoseconds
export type Timestamp = bigint;


// Action class
export type Action = {
  source: Container;
  target: Container;
  operation: string;
}

// CallResponse enum
export type CallResponse =
  | { type: "NotCompleted" }
  | { type: "Error"; operationId: number; timestamp: Timestamp; bang: any }
  | { type: "Completed"; operationId: number; timestamp: Timestamp; result: any };

export const durationOfCall = (cc : CompletedCall) => {
  const typ = cc.response.type
  if (typ == "NotCompleted") {
    return null
  } else if (typ === "Error") {
    return cc.response.timestamp - cc.invocation.timestamp
  } else if (typ === "Completed") {
    return cc.response.timestamp - cc.invocation.timestamp
  } else {
    throw new Error(`Bug - unhandled response: ${typ}`)
  }
}

export const timestampForResponse = (cr :CallResponse) => {
  if (cr.type == "NotCompleted") {
    return null
  } else if (cr.type === "Error") {
    return cr.timestamp
  } else if (cr.type === "Completed") {
    return cr.timestamp
  } else {
    throw new Error(`Bug - unhandled: ${cr}`)
  }
}

// CallSite class
export type  CallSite = {
  action: Action;
  inputs: any[];
  timestamp: Timestamp;
}

// CompletedCall class
export type CompletedCall = {
  callId: number;
  responseId: number | null;
  invocation: CallSite;
  response: CallResponse;
}

export const endTimestamp = (cc :CompletedCall) => timestampForResponse(cc.response)

const isSafeBigIntToNumber = (value: bigint): boolean => value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
const asNumber = (x : bigint) : number => {
  if (!isSafeBigIntToNumber(x)) {
    throw new Error(`Cannot convert ${x} to a number`)
  }
  return Number(x)
}

export const timestampForCall = (c : CompletedCall) => asNumber(c.invocation.timestamp)

export type Container = {
    type: ContainerType;
    softwareSystem: string;
    label: string;
    tags: Set<string>;
  }

 export const qualified = (c : Container) => `${c.softwareSystem}.${c.label}`

  const createContainer = (
    type: ContainerType,
    softwareSystem: string,
    label: string,
    tags: Set<string> = new Set()
  ): Container => ({
    type,
    softwareSystem,
    label,
    tags,
  });
  
  // Specific convenience methods for each ContainerType
  export const newSystem = (softwareSystem: string, label: string, tags?: Set<string>): Container =>
    createContainer("System", softwareSystem, label, tags);
  
  export const newDatabase = (softwareSystem: string, label: string, tags?: Set<string>): Container =>
    createContainer("Database", softwareSystem, label, tags);
  
  export const newJob = (softwareSystem: string, label: string, tags?: Set<string>): Container =>
    createContainer("Job", softwareSystem, label, tags);
  
  export const newPerson = (softwareSystem: string, label: string, tags?: Set<string>): Container =>
    createContainer("Person", softwareSystem, label, tags);

  const parseArgs = (attributes: Record<string, any>) : string[] => {
    let index = 0;
    let tags : string[] = []
    while (attributes[`arg${index}`]) {
      let attribute = attributes[`arg${index}`]
      const value = typeof attribute === 'string' ? attribute : JSON.stringify(attribute);
      tags.push(value);
      index++;
    }
    return tags
  }
export function parseOpenTelemetryJson(json: any): CompletedCall[] {
    const completedCalls: CompletedCall[] = [];
  
    // Helper to extract attributes into a key-value object
    const extractAttributes = (attributes: any[]): Record<string, any> => {
      return attributes.reduce((acc, attr) => {
        acc[attr.key] = attr.value.stringValue || attr.value.intValue || attr.value.boolValue;
        return acc;
      }, {});
    };
  
    // Helper to parse a Container from attributes
    const parseContainer = (
      systemKey: string,
      tagPrefix: string,
      labelKey: string,
      attributes: Record<string, any>
    ): Container => {
      // Extract the type from the first tag (e.g., "from-tag-0" -> "System")
      const type = attributes[`${tagPrefix}-0`] || "System"; // Default to "System" if no tag is found
  
      // Extract all tags with the given prefix (e.g., "from-tag-0", "from-tag-1", etc.)
      const tags = new Set<string>();
      let index = 0;
      while (attributes[`${tagPrefix}-${index}`]) {
        tags.add(attributes[`${tagPrefix}-${index}`]);
        index++;
      }
  
      return {
        type: type as ContainerType, // Cast to ContainerType
        softwareSystem: attributes[systemKey],
        label: attributes[labelKey],
        tags,
      };
    };
  
    // Iterate over resourceSpans
    json.resourceSpans.forEach((resourceSpan: any) => {
      resourceSpan.scopeSpans.forEach((scopeSpan: any) => {
        scopeSpan.spans.forEach((span: any) => {
          const attributes = extractAttributes(span.attributes);
  
          // Parse source and target containers from attributes
          const source = parseContainer("fromSystem", "from-tag", "fromLabel", attributes);
          const target = parseContainer("toSystem", "to-tag", "toLabel", attributes);
  
          // Create Action
          const action: Action = {
            source,
            target,
            operation: span.name,
          };

          const callId = attributes['callId']
  
          let inputs = parseArgs(attributes)

          // Create CallSite
          const callSite: CallSite = {
            action,
            inputs,
            timestamp: Math.floor(Number(span.startTimeUnixNano) / 1e6), // Convert to milliseconds
          };
  
          // Create CallResponse
          const callResponse: CallResponse =
            span.status.code === 1
              ? { type: "Completed", operationId: 0, timestamp: Math.floor(Number(span.endTimeUnixNano) / 1e6), result: "Success" }
              : { type: "Error", operationId: 0, timestamp: Math.floor(Number(span.endTimeUnixNano) / 1e6), bang: "Error occurred" };
  
          // Create CompletedCall
          const completedCall: CompletedCall = {
            callId: callId, //span.traceId,
            responseId: span.spanId,
            invocation: callSite,
            response: callResponse,
          };
  
          completedCalls.push(completedCall);
        });
      });
    });
  
    return completedCalls.sort((a, b) => a.invocation.timestamp - b.invocation.timestamp);
  }

  function trace<T>(from : Container, to :Container, name: string, args: any[], thunk: () => T): T  {

  }