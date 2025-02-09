import { Colors } from "./colors";
import { SendMessage } from "./sendMessage"; // Assuming you have this type
import { qualified, type CompletedCall, type Container, type ContainerType } from "./telemetry"; // Assuming you have these types

/**
 * Utility class for generating PlantUML sequence diagrams.
 */
export class PlantUML {
  constructor(public calls: CompletedCall[]) {}

  /**
   * Generates a PlantUML diagram as a string.
   * @param name - The name of the diagram.
   * @param maxLenComment - Maximum length for comments.
   * @param maxComment - Maximum length for truncated comments.
   * @returns The PlantUML diagram as a string.
   */
  diagram(name: string, maxLenComment: number = 60, maxComment: number = 30): string {
    return `@startuml ${name}
${this.participants.join("\n")}

${this.sequenceDiagram(maxLenComment, maxComment)}
@enduml`;
  }

  /**
   * Converts the list of calls into a sequence of SendMessage objects.
   */
  get callStack(): SendMessage[] {
    return SendMessage.from(this.calls);
  }

  /**
   * Generates the sequence diagram part of the PlantUML diagram.
   */
  sequenceDiagram(maxLenComment: number, maxComment: number): string {
    const stack = this.callStack;
    const statements = stack.map((msg) => msg.asPlantUMLString(maxLenComment, maxComment));
    return statements.join("\n");
  }

  /**
   * Generates participant statements for the PlantUML diagram, grouped by category.
   */
  private get participants(): string[] {
    const [orderedCategories, actorsByCategory] = SendMessage.participants(this.calls);

    return orderedCategories
      .map((category, index) => {
        const color = Colors.lightNamedColors[index % Colors.lightNamedColors.length];
        return (actorsByCategory.get(category) || [])
          .map((actor) => {
            const plantType = this.getPlantType(actor.type);
            return `${plantType} ${qualified(actor)} ${color}`;
          })
          .join("\n");
      })
      .flat();
  }

  /**
   * Maps a ContainerType to a PlantUML participant type.
   */
  private getPlantType(type: ContainerType): string {
    switch (type) {
      case "Person":
        return "actor";
      case "Database":
        return "database";
      case "Job":
        return "job";
      default:
        return "participant";
    }
  }
}
