
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

export const durationOfCall = (cc : CompletedCall) : Timestamp | null => {
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
export const asTimestamp = (x : bigint) : number => {
  if (!isSafeBigIntToNumber(x)) {
    throw new Error(`Cannot convert ${x} to a number`)
  }
  return Number(x)
}

export const timestampForCall = (c : CompletedCall) => asTimestamp(c.invocation.timestamp)

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
