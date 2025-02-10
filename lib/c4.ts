import { type CompletedCall } from "./telemetry"; // Assuming you have this type
import { SendMessage } from "./sendMessage"; // Assuming you have this type
import { type Container, type ContainerType } from "./telemetry"; // Assuming you have these types
import { Colors } from "./colors";

/**
 * Main C4 class for generating diagrams.
 */
export class C4 {
  constructor(public calls: CompletedCall[]) {}

  /**
   * Generates a C4 diagram.
   */
  diagram(settings: C4.Style = {}): string {
    return `
workspace {
    model {
        // ================================================
        // Users
        // ================================================
        ${this.users}

        // ================================================
        // Software Systems
        // ================================================
        ${this.softwareSystems}

        // ================================================
        // Interactions
        // ================================================
        ${this.interactions}
    }

    views {
        ${this.views(settings)}

        theme default

        styles {
         ${settings.style || C4.DefaultStyle}

${this.colors(settings.colorMap || new Map())}
        }

        dynamic ${this.dynamicName} {
          ${this.sequenceDiagram}
          ${settings.dynamicLayout || ""}
        }
    }

    configuration {
        scope none
    }
}`;
  }

  /**
   * Gets all people involved in the calls.
   */
  private get people(): string[] {
    return Array.from(
      new Set(
        this.calls
          .filter((call) => call.invocation.action.source.type === "Person")
          .map((call) => call.invocation.action.source.label)
      )
    );
  }

  /**
   * Generates the users section of the C4 diagram.
   */
  private get users(): string {
    return this.people
      .map((name) => `        ${C4.asPerson(name)} = person "${name}"`)
      .join("\n");
  }

  /**
   * Groups calls by software system.
   */
  private get systems(): C4.SoftwareSystem[] {
    const callsByTargetSystem = new Map<string, CompletedCall[]>();
    const callsBySourceSystem = new Map<string, CompletedCall[]>();

    this.calls.forEach((call) => {
      const targetSystem = call.invocation.action.target.softwareSystem;
      const sourceSystem = call.invocation.action.source.softwareSystem;

      callsByTargetSystem.set(targetSystem, [
        ...(callsByTargetSystem.get(targetSystem) || []),
        call,
      ]);
      callsBySourceSystem.set(sourceSystem, [
        ...(callsBySourceSystem.get(sourceSystem) || []),
        call,
      ]);
    });

    const allSystems = new Set([
      ...callsByTargetSystem.keys(),
      ...callsBySourceSystem.keys(),
    ]);

    return Array.from(allSystems).map((name) => {
      const callsIntoTarget = callsByTargetSystem.get(name) || [];
      const callsFromSource = callsBySourceSystem.get(name) || [];
      return new C4.SoftwareSystem(name, callsIntoTarget, callsFromSource);
    });
  }

  /**
   * Generates the software systems section of the C4 diagram.
   */
  private get softwareSystems(): string {
    return this.systems.map((system) => system.asC4()).join("\n");
  }

  /**
   * Generates the sequence diagram section of the C4 diagram.
   */
  private get sequenceDiagram(): string {
    return SendMessage.from(this.calls)
      .map((msg) => msg.asC4String())
      .join("\n\t");
  }

  /**
   * Gets the name of the dynamic view.
   */
  private get dynamicName(): string {
    return C4.asSystem(this.systems.length > 0 ? this.systems[0].name : "");
  }

  /**
   * Generates the interactions section of the C4 diagram.
   */
  private get interactions(): string {
    const groupedCalls = new Map<string, CompletedCall[]>();

    this.calls.forEach((call) => {
      const key = `${call.invocation.action.source.label}-${call.invocation.action.target.label}`;
      groupedCalls.set(key, [...(groupedCalls.get(key) || []), call]);
    });

    return Array.from(groupedCalls.entries())
      .map(([key, calls]) => {
        const [from, to] = key.split("-");
        const operations = calls
          .map((call) => call.invocation.action.operation)
          .filter((value, index, self) => self.indexOf(value) === index);

        const operationsString =
          operations.length === 1
            ? operations[0]
            : `${operations.slice(0, -1).join(", ")} and ${
                operations[operations.length - 1]
              }`;

        return `        ${C4.asContainer(from)} -> ${C4.asContainer(
          to
        )} "${operationsString}"`;
      })
      .join("\n");
  }

  /**
   * Generates the views section of the C4 diagram.
   */
  private views(style: C4.Style): string {
    return this.systems
      .map(
        (system) => `
        systemContext ${C4.asSystem(system.name)} "${system.name}" {
            include *
            ${
              style.layoutByName?.get(system.name) ||
              style.defaultSystemLayout ||
              "autolayout lr"
            }
        }

        container ${C4.asSystem(system.name)} {
            include *
            ${
              style.layoutByName?.get(system.name) ||
              style.defaultContainerLayout ||
              "autolayout lr"
            }
        }`
      )
      .join("\n");
  }

  /**
   * Generates the colors section of the C4 diagram.
   */
  private colors(colorMap: Map<string, C4.ElementStyle>): string {
    return this.systems
      .map((system, index) => {
        const color = Colors.namedColors[index % Colors.namedColors.length];
        const bg = colorMap.get(system.name)?.bgColor || color;
        const fg = colorMap.get(system.name)?.color || "#000000";

        return `
            element "${system.name}" {
                 background "${bg}"
                 color "${fg}"
            }`;
      })
      .join("\n");
  }
}

/**
 * Utility class for generating C4 model diagrams.
 */
export namespace C4 {
  export interface ElementStyle {
    bgColor: string;
    color: string;
  }

  export interface Style {
    style?: string;
    colorMap?: Map<string, ElementStyle>;
    layoutByName?: Map<string, string>;
    defaultSystemLayout?: string;
    defaultContainerLayout?: string;
    dynamicLayout?: string;
  }

  /**
   * Represents a software system in the C4 model.
   */
  export class SoftwareSystem {
    constructor(
      public name: string,
      public callsIntoThisSystem: CompletedCall[],
      public callFromThisSystem: CompletedCall[]
    ) {}

    /**
     * Filters calls to ensure uniqueness by source and operation.
     */
    private distinctBySource(calls: CompletedCall[]): CompletedCall[] {
      return calls.reduce((seq, next) => {
        if (
          seq.some(
            (c) =>
              c.invocation.action.source === next.invocation.action.source &&
              c.invocation.action.operation === next.invocation.action.operation
          )
        ) {
          return seq;
        }
        return [...seq, next];
      }, [] as CompletedCall[]);
    }

    /**
     * Filters calls to ensure uniqueness by target and operation.
     */
    private distinctByTarget(calls: CompletedCall[]): CompletedCall[] {
      return calls.reduce((seq, next) => {
        if (
          seq.some(
            (c) =>
              c.invocation.action.target === next.invocation.action.target &&
              c.invocation.action.operation === next.invocation.action.operation
          )
        ) {
          return seq;
        }
        return [...seq, next];
      }, [] as CompletedCall[]);
    }

    /**
     * Groups calls by source container.
     */
    private get outgoingContainerCalls(): Map<Container, CompletedCall[]> {
      const grouped = new Map<Container, CompletedCall[]>();
      this.callFromThisSystem.forEach((call) => {
        const existing = grouped.get(call.invocation.action.source) || [];
        grouped.set(call.invocation.action.source, [...existing, call]);
      });
      return new Map(
        Array.from(grouped.entries()).map(([key, value]) => [
          key,
          this.distinctByTarget(value),
        ])
      );
    }

    /**
     * Groups calls by target container.
     */
    private get incomingContainerCalls(): Map<Container, CompletedCall[]> {
      const grouped = new Map<Container, CompletedCall[]>();
      this.callsIntoThisSystem.forEach((call) => {
        const existing = grouped.get(call.invocation.action.target) || [];
        grouped.set(call.invocation.action.target, [...existing, call]);
      });
      return new Map(
        Array.from(grouped.entries()).map(([key, value]) => [
          key,
          this.distinctBySource(value),
        ])
      );
    }

    /**
     * Gets all containers involved in this system.
     */
    private get containers(): Set<Container> {
      return new Set([
        ...this.outgoingContainerCalls.keys(),
        ...this.incomingContainerCalls.keys(),
      ]);
    }

    /**
     * Converts this software system to a C4 model string.
     */
    asC4(): string {
      const declarations = Array.from(this.containers)
        .map(
          (container) => `
               ${asContainer(container.label)} = container "${
            container.label
          }" {
                 tags "${container.type}" "${container.label}"
               }`
        )
        .join("\n");

      return `
      ${asSystem(this.name)} = softwareSystem "${this.name}" {
         tags "${this.name}"
  ${declarations}
      }`;
    }
  }

  /**
   * Default C4 style.
   */
  export const DefaultStyle = `
              element "Element" {
                  color #ffffff
              }
              element "Person" {
                  background #05527d
                  shape person
              }
              element "Software System" {
                  background #066296
              }
              element "Script" {
                  shape diamond
              }
              element "Job" {
                  shape circle
              }
              element "FileSystem" {
                  shape box
              }
              element "DesktopApp" {
                  shape hexagon
              }
              element "WebApp" {
                  shape hexagon
              }
              element "MobileApp" {
                  shape hexagon
              }
              element "Container" {
                  background #0773af
              }
              element "Function" {
                  shape diamond
              }
              element "Service" {
                  shape roundedbox
              }
              element "Queue" {
                  shape ellipse
              }
              element "Queue" {
                  shape cylinder
              }
              element "Database" {
                  shape cylinder
              }`;

  /**
   * Extension methods for strings.
   */
  export function asIdentifier(text: string): string {
    return text.replace(/\s+/g, "");
  }

  export function asPerson(text: string): string {
    return `${asIdentifier(text)}Person`;
  }

  export function asSystem(text: string): string {
    return `${asIdentifier(text)}System`;
  }

  export function asContainer(text: string): string {
    return `${asIdentifier(text)}Container`;
  }

  export function asComponent(text: string): string {
    return `${asIdentifier(text)}Component`;
  }
}
