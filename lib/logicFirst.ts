import { C4 } from "./c4";
import { Mermaid } from "./mermaid";
import { PlantUML } from "./plantUML";
import type { CompletedCall } from "./telemetry";

/**
 * Wraps parsed telemetry data as 'CompletedCall's, which can then be represented as C4, Mermaid, PlantUML, etc docs
 */
export class LogicFirst {
  public calls: CompletedCall[];

  constructor(calls: CompletedCall[]) {
    this.calls = calls;
  }

  /**
   * Converts the logic to a C4 model representation.
   */
  public get c4(): C4 {
    return new C4(this.calls);
  }

  public get plantUML(): PlantUML {
    return new PlantUML(this.calls);
  }
  public get mermaid(): Mermaid {
    return new Mermaid(this.calls);
  }
}
