import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Text } from '@chakra-ui/react';

export interface PlotData {
    spec: any; // Vega-Lite spec
}

export interface PlotBlockDef extends BlockDef {
    kind: "plot";
    data: PlotData;
}

export class PlotBlock extends BlockBase {
    static kind = "plot";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        // In production, you'd use vega-embed to render the plot
        return (
            <Box p={4} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" color="gray.600" mb={2}>
                    Vega-Lite Plot (rendering not implemented)
                </Text>
                <pre style={{ fontSize: "xs", overflow: "auto" }}>
                    {JSON.stringify(this.def.data.spec, null, 2)}
                </pre>
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
