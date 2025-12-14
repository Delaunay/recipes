import React, { useState } from 'react';
import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Text, Textarea } from '@chakra-ui/react';

export interface LatexData {
    formula: string;
}

export interface LatexBlockDef extends BlockDef {
    kind: "latex";
    data: LatexData;
}

export class LatexBlock extends BlockBase {
    static kind = "latex";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        if (mode === "edit") {
            return <LatexEditor block={this} />;
        }
        // For now, just display the formula as text. In production, you'd use KaTeX or MathJax
        return (
            <Box p={4} bg="gray.50" borderRadius="md" textAlign="center">
                <Text fontFamily="mono" fontSize="lg">
                    {this.def.data.formula}
                </Text>
            </Box>
        );
    }

    is_md_representable(): boolean {
        return true;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        return `$$${this.def.data.formula}$$`;
    }
}

function LatexEditor({ block }: { block: LatexBlock }) {
    const [formula, setFormula] = useState(block.def.data.formula || "");

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFormula(e.target.value);
        block.def.data.formula = e.target.value;
        block.version += 1;
    };

    return (
        <Textarea
            value={formula}
            onChange={handleChange}
            placeholder="Enter LaTeX formula (e.g., E = mc^2)"
            fontFamily="mono"
            rows={3}
        />
    );
}
