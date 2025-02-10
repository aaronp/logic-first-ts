import { asTimestamp, durationOfCall, endTimestamp, qualified, timestampForCall, type CompletedCall, type Container, type Timestamp } from "./telemetry";

// Duration type (assuming it's a number representing milliseconds)
type Duration = number;

/**
 * Representation of a message being sent from one actor to another -- an enriched intermediary repsesentation of the open-telemtry message
 * suited for converting to diagrams
 * 
 */
export class SendMessage {
  constructor(
    public callId: number,
    public from: Container,
    public to: Container,
    public timestamp: Timestamp,
    public duration: Duration,
    public arrow: string, // The Mermaid arrow (a bit hacky)
    public operation: string,
    public input: any,
    public comment: string = ""
  ) {}

  /**
   * Returns the timestamp as a JavaScript Date object.
   */
  get atDateTime(): Date {
    return new Date(asTimestamp(this.timestamp));
  }

  /**
   * Converts this operation to a C4 string.
   * @see https://docs.structurizr.com/dsl/cookbook/dynamic-view-parallel/
   */
  asC4String(maxLenComment: number = 20, maxComment: number = 30): string {
    return `${this.from.label} -> ${this.to.label} "${this.operation}"`;
  }

  /**
   * Converts this operation to a Mermaid string.
   */
  asMermaidString(maxLenComment: number = 20, maxComment: number = 30): string {
    return `${qualified(this.from)} ${this.arrow} ${qualified(this.to)} : ${this.msg(maxLenComment, maxComment)}`;
  }

  /**
   * Converts this operation to a PlantUML string.
   */
  asPlantUMLString(maxLenComment: number = 20, maxComment: number = 30): string {
    const planUMLArrow = this.arrow.replace("->>+", "->").replace("->>", "->").replace("-->>", "-->").replace("-->>-", "-->");
    return `${qualified(this.from)} ${planUMLArrow} ${qualified(this.to)} : ${this.msg(maxLenComment, maxComment)}`;
  }

  /**
   * Returns a pretty-printed string representation of the message.
   */
  get pretty(): string {
    return `${this.timestamp}@${this.callId}: ${this.from}:${this.operation} ${this.arrow} ${this.to} w/ ${this.input} took ${this.duration} at ${this.atDateTime}`;
  }

  /**
   * Returns the end timestamp of the message.
   */
  get endTimestamp(): Timestamp {
    return this.timestamp + BigInt(this.duration * 1e6); // Convert duration to nanoseconds
  }

  /**
   * Checks if the message is active at the given time.
   */
  isActiveAt(time: Timestamp): boolean {
    return this.timestamp <= time && time <= this.endTimestamp;
  }

  /**
   * Formats the input for display.
   */
  get inputFormatted(): string {
    if (typeof this.input === "object" && this.input !== null) {
      const json = this.input;
      if (json.action) {
        const action = json.action;
        delete json.action;
        return `${this.chompQuotes(action)} ${JSON.stringify(json)}`;
      } else {
        return JSON.stringify(json);
      }
    } else {
      return this.input?.toString() || "";
    }
  }

  /**
   * Formats the message for display.
   */
  get messageFormatted(): string {
    return `${this.operation}(${this.inputFormatted})`;
  }

  /**
   * Truncates a string to the specified length, adding an ellipsis in the middle if necessary.
   */
  private truncate(str: string, len: number = 85): string {
    const opString = str.replace(/\n/g, ""); // Remove newlines
    if (opString.length <= len) return opString;

    const middle = len / 2;
    const charsOver = opString.length - middle;
    return `${opString.slice(0, middle - 2)}...${opString.slice(charsOver + 1)}`;
  }

  /**
   * Removes surrounding quotes from a string.
   */
  private chompQuotes(str: string): string {
    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, -1);
    }
    return str;
  }

  /**
   * Returns the message or comment, truncated if necessary.
   */
  private msg(maxLenComment: number, maxComment: number): string {
    return this.comment ? this.truncate(this.comment, maxComment) : this.truncate(this.messageFormatted, maxLenComment);
  }
}

/**
 * Utility functions for SendMessage.
 */
export namespace SendMessage {
  type OrderedCategories = string[];
  type ActorsByCategory = Map<string, Container[]>;

  /**
   * Extracts participants from a list of completed calls.
   */
  export function participants(all: CompletedCall[]): [OrderedCategories, ActorsByCategory] {
    return all
      .sort((a, b) => timestampForCall(a) - timestampForCall(b))
      .reduce(
        ([categories, coordsByCategory], call) => {
          const newMap = new Map(coordsByCategory);

          const source = call.invocation.action.source
          const target = call.invocation.action.target
          // Update source
          if (!newMap.has(source.softwareSystem)) {
            newMap.set(source.softwareSystem, [source]);
          } else if (!newMap.get(source.softwareSystem)!.includes(source)) {
            newMap.get(source.softwareSystem)!.push(source);
          }

          // Update target
          if (!newMap.has(target.softwareSystem)) {
            newMap.set(target.softwareSystem, [target]);
          } else if (!newMap.get(target.softwareSystem)!.includes(target)) {
            newMap.get(target.softwareSystem)!.push(target);
          }

          // Update categories
          const newCategories = [...categories];
          if (!newCategories.includes(source.softwareSystem)) {
            newCategories.push(source.softwareSystem);
          }
          if (!newCategories.includes(target.softwareSystem)) {
            newCategories.push(target.softwareSystem);
          }

          return [newCategories, newMap];
        },
        [[], new Map<string, Container[]>()] as [OrderedCategories, ActorsByCategory]
      );
  }

  /**
   * Generates a comment for the result of a completed call.
   */
  function commentForResult(call: CompletedCall): string {
    switch (call.response.type) {
      case "NotCompleted":
        return "never completed";
      case "Error":
        return `Failed with '${call.response.bang}'`;
      case "Completed":
        return `${call.response.result}`;
    }
  }

  /**
   * Represents a message event (start or end).
   */
  enum MsgType {
    Start,
    End,
  }

  interface Msg {
    type: MsgType;
    call: CompletedCall;
    endTimestamp?: Timestamp;
  }

  /**
   * Converts a list of completed calls into a list of SendMessage objects.
   */
  export function from(calls: CompletedCall[]): SendMessage[] {
    const messages: Msg[] = [];

    // Create start and end messages
    for (const call of calls) {
      messages.push({ type: MsgType.Start, call });

      const endTime = endTimestamp(call)
      if (endTime) {
        messages.push({ type: MsgType.End, call, endTimestamp: endTime });
      }
    }

    // Sort messages by callId
    messages.sort((a, b) => a.call.callId - b.call.callId);

    // Convert messages to SendMessage objects
    return messages.flatMap((msg, i) => {
      const source = msg.call.invocation.action.source
      const target = msg.call.invocation.action.target
      if (msg.type === MsgType.Start) {
        const timestamp = msg.call.invocation.timestamp
        const isSelfCall = source === target;
        const isSynchronous = messages[i + 1]?.type === MsgType.End && messages[i + 1].call.callId === msg.call.callId;

        const arrow = isSelfCall ? "->>" : isSynchronous ? "->>" : "->>+";
        const elideThisMessage = isSynchronous && isSelfCall;

        if (elideThisMessage) {
          return [];
        } else {
          const duration = durationOfCall(msg.call)
          return [
            new SendMessage(
              msg.call.callId,
              source,
              target,
              timestamp,
              duration ? asTimestamp(duration) : Infinity,
              arrow,
              msg.call.invocation.action.operation,
              msg.call.invocation.inputs
            ),
          ];
        }
      } else if (msg.type === MsgType.End) {
        const isSynchronous = messages[i - 1]?.type === MsgType.Start && messages[i - 1].call.callId === msg.call.callId;

        const comment = isSynchronous
          ? `${msg.call.invocation.action.operation} -> ${commentForResult(msg.call)}`
          : commentForResult(msg.call);

        const arrow = isSynchronous ? "-->>" : "-->>-";
        const duration = durationOfCall(msg.call)

        return [
          new SendMessage(
            msg.call.responseId || Number.MAX_SAFE_INTEGER,
            target,
            source,
            msg.endTimestamp!,
            duration ? asTimestamp(duration) : Infinity,
            arrow,
            msg.call.invocation.action.operation,
            msg.call.invocation.inputs,
            comment
          ),
        ];
      } else {
        return [];
      }
    });
  }
}