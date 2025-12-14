import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Text } from '@chakra-ui/react';

export interface TocData {
    title?: string;
    maxLevel?: number;
}

export interface TocBlockDef extends BlockDef {
    kind: "toc";
    data: TocData;
}

export class TocBlock extends BlockBase {
    static kind = "toc";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        // TOC is typically auto-generated, so we'll just show a placeholder for now
        return (
            <Box>
                <Text fontWeight="bold">{this.def.data.title || "Table of Contents"}</Text>
                <Text fontSize="sm" color="gray.500">(Auto-generated)</Text>
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
