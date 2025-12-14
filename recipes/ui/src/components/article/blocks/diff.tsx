import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Code, Text } from '@chakra-ui/react';

export interface DiffData {
    filename?: string;
    language?: string;
    before: string;
    after: string;
}

export interface DiffBlockDef extends BlockDef {
    kind: "diff";
    data: DiffData;
}

export class DiffBlock extends BlockBase {
    static kind = "diff";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        return (
            <Box>
                {this.def.data.filename && (
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                        {this.def.data.filename}
                    </Text>
                )}
                <Box display="grid" gridTemplateColumns="1fr 1fr" gap={4}>
                    <Box>
                        <Text fontSize="xs" color="red.600" mb={1}>Before</Text>
                        <Code display="block" whiteSpace="pre-wrap" p={2} bg="red.50" fontSize="xs">
                            {this.def.data.before}
                        </Code>
                    </Box>
                    <Box>
                        <Text fontSize="xs" color="green.600" mb={1}>After</Text>
                        <Code display="block" whiteSpace="pre-wrap" p={2} bg="green.50" fontSize="xs">
                            {this.def.data.after}
                        </Code>
                    </Box>
                </Box>
            </Box>
        );
    }

    is_md_representable(): boolean {
        return false;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        return "";
    }
}
