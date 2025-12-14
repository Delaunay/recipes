import React, { useState } from 'react';
import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Textarea } from '@chakra-ui/react';

export interface MermaidData {
    diagram: string;
}

export interface MermaidBlockDef extends BlockDef {
    kind: "mermaid";
    data: MermaidData;
}

export class MermaidBlock extends BlockBase {
    static kind = "mermaid";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        if (mode === "edit") {
            return <MermaidEditor block={this} />;
        }
        // For now, just display the diagram code. In production, you'd use mermaid.js to render
        return (
            <Box p={4} bg="gray.50" borderRadius="md">
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "mono", fontSize: "sm" }}>
                    {this.def.data.diagram}
                </pre>
            </Box>
        );
    }

    is_md_representable(): boolean {
        return true;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        return `\`\`\`mermaid\n${this.def.data.diagram}\n\`\`\``;
    }
}

function MermaidEditor({ block }: { block: MermaidBlock }) {
    const [diagram, setDiagram] = useState(block.def.data.diagram || "");

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDiagram(e.target.value);
        block.def.data.diagram = e.target.value;
        block.version += 1;
    };

    return (
        <Textarea
            value={diagram}
            onChange={handleChange}
            placeholder="Enter Mermaid diagram code"
            fontFamily="mono"
            rows={Math.max(5, diagram.split("\n").length)}
        />
    );
}
