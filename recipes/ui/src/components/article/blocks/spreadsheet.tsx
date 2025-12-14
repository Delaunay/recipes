import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Text, Table } from '@chakra-ui/react';

export interface SpreadsheetData {
    title?: string;
    headers?: string[];
    showHeaders?: boolean;
    data: string[][];
}

export interface SpreadsheetBlockDef extends BlockDef {
    kind: "spreadsheet";
    data: SpreadsheetData;
}

export class SpreadsheetBlock extends BlockBase {
    static kind = "spreadsheet";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        const headers = this.def.data.headers || [];
        const data = this.def.data.data || [];
        const showHeaders = this.def.data.showHeaders !== false;

        return (
            <Box>
                {this.def.data.title && (
                    <Text fontWeight="bold" mb={2}>{this.def.data.title}</Text>
                )}
                <Table.Root>
                    {showHeaders && headers.length > 0 && (
                        <Table.Header>
                            <Table.Row>
                                {headers.map((header, i) => (
                                    <Table.ColumnHeader key={i}>{header}</Table.ColumnHeader>
                                ))}
                            </Table.Row>
                        </Table.Header>
                    )}
                    <Table.Body>
                        {data.map((row, rowIdx) => (
                            <Table.Row key={rowIdx}>
                                {row.map((cell, cellIdx) => (
                                    <Table.Cell key={cellIdx}>{cell}</Table.Cell>
                                ))}
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>
        );
    }

    is_md_representable(): boolean {
        return true;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        const headers = this.def.data.headers || [];
        const data = this.def.data.data || [];
        const showHeaders = this.def.data.showHeaders !== false;

        let md = "";
        if (showHeaders && headers.length > 0) {
            md += "| " + headers.join(" | ") + " |\n";
            md += "| " + headers.map(() => "---").join(" | ") + " |\n";
        }
        data.forEach(row => {
            md += "| " + row.join(" | ") + " |\n";
        });
        return md;
    }
}
