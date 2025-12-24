import React, { useState } from 'react';
import { BlockBase, BlockDef, MarkdownGeneratorContext, BlockSetting } from "../base";
import { Box, Code, Textarea } from '@chakra-ui/react';

export interface CodeData {
    language?: string;
    theme?: string;
    code: string;
}

export interface CodeBlockDef extends BlockDef {
    kind: "code";
    data: CodeData;
}

export class CodeBlock extends BlockBase {
    static kind = "code";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        if (mode === "edit") {
            return <CodeEditor block={this} />;
        }
        return (
            <Box>
                <Code
                    display="block"
                    whiteSpace="pre-wrap"
                    p={4}
                    borderRadius="md"
                    overflowX="auto"
                >
                    {this.def.data.code}
                </Code>
            </Box>
        );
    }

    has_settings(): boolean {
        return true;
    }

    settings(): BlockSetting {
        return {
            language: { "type": "string", "required": false },
            theme:    { "type": "string", "required": false },
        }
    }

    is_md_representable(): boolean {
        return true;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        const lang = this.def.data.language || "";
        return `\`\`\`${lang}\n${this.def.data.code}\n\`\`\``;
    }
}

function CodeEditor({ block }: { block: CodeBlock }) {
    const [code, setCode] = useState(block.def.data.code || "");
    const [language, setLanguage] = useState(block.def.data.language || "");

    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCode(e.target.value);
        block.def.data.code = e.target.value;
        block.version += 1;
    };

    return (
        <Box>
            <Textarea
                value={code}
                onChange={handleCodeChange}
                fontFamily="mono"
                rows={Math.max(5, code.split("\n").length)}
                placeholder="Enter code..."
            />
        </Box>
    );
}
