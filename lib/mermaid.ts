import { qualified, type CompletedCall } from "./telemetry"; // Assuming you have this type
import { SendMessage } from "./sendMessage"; // Assuming you have this type

/**
 * Utility class for generating Mermaid sequence diagrams.
 */
export class Mermaid {
  static DefaultMermaidStyle = `%%{init: {"theme": "dark",
    "themeVariables": {"primaryTextColor": "grey", "secondaryTextColor": "black", "fontFamily": "Arial", "fontSize": 14, "primaryColor": "#3498db"}}}%%`;

  constructor(public calls: CompletedCall[]) {}

  /**
   * Generates a Mermaid diagram as a string, removing the markdown code block syntax.
   */
  asMermaid(
    mermaidStyle: string = Mermaid.DefaultMermaidStyle,
    maxLenComment: number = 60,
    maxComment: number = 30
  ): string {
    return this.diagram(mermaidStyle, maxLenComment, maxComment)
      .replace("```mermaid", "")
      .replace("```", "")
      .trim();
  }

  /**
   * Generates a full Mermaid diagram as a markdown code block.
   */
  diagram(
    mermaidStyle: string = Mermaid.DefaultMermaidStyle,
    maxLenComment: number = 60,
    maxComment: number = 30
  ): string {
    return `\n\`\`\`mermaid\n${mermaidStyle}\n${this.sequenceDiagram(maxLenComment, maxComment)}\`\`\`\n`;
  }

  /**
   * Converts the list of calls into a sequence of SendMessage objects.
   */
  get callStack(): SendMessage[] {
    return SendMessage.from(this.calls);
  }

  /**
   * Generates the sequence diagram part of the Mermaid diagram.
   */
  sequenceDiagram(maxLenComment: number, maxComment: number): string {
    const stack = this.callStack;
    const statements = stack.map((msg) => msg.asMermaidString(maxLenComment, maxComment));

    // Group participants by category and generate the diagram
    const participantStatements = this.participants(this.calls);
    return `sequenceDiagram\n\t${participantStatements.join("\n\t")}\n\t${statements.join("\n\t")}\n`;
  }

  /**
   * Generates participant statements for the Mermaid diagram, grouped by category.
   */
  private participants(all: CompletedCall[]): string[] {
    const [orderedCategories, actorsByCategory] = SendMessage.participants(all);

    return orderedCategories
      .map((category, index) => {
        const color = Colors.namedColors[index % Colors.namedColors.length];
        const participants = (actorsByCategory.get(category) || [])
          .map((actor) => `participant ${qualified(actor)}`)
          .join("\n\t");

        return `box ${color} ${category}\n\t${participants}\nend`;
      });
  }
}

/**
 * Utility class for named colors.
 */
class Colors {
  static namedColors = [
    "#3498db", // Blue
    "#e74c3c", // Red
    "#2ecc71", // Green
    "#f1c40f", // Yellow
    "#9b59b6", // Purple
    "#1abc9c", // Teal
    "#e67e22", // Orange
    "#34495e", // Dark Blue
  ];
}