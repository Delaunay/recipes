import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Text, Table } from '@chakra-ui/react';

export interface TableData {
    format?: string;
    showHeaders?: boolean;
    caption?: string;
    data: string; // JSON string
}

export interface TableBlockDef extends BlockDef {
    kind: "table";
    data: TableData;
}

export class TableBlock extends BlockBase {
    static kind = "table";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        let parsedData: any[] = [];
        let headers: string[] = [];

        try {
            parsedData = JSON.parse(this.def.data.data || "[]");
            if (parsedData.length > 0) {
                headers = Object.keys(parsedData[0]);
            }
        } catch (e) {
            console.error("Failed to parse table data", e);
        }

        const showHeaders = this.def.data.showHeaders !== false;

        return (
            <Box>
                <Table.Root>
                    {this.def.data.caption && (
                        <Table.Caption>{this.def.data.caption}</Table.Caption>
                    )}
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
                        {parsedData.map((row, rowIdx) => (
                            <Table.Row key={rowIdx}>
                                {headers.map((header, cellIdx) => (
                                    <Table.Cell key={cellIdx}>{row[header]}</Table.Cell>
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
        let parsedData: any[] = [];
        let headers: string[] = [];

        try {
            parsedData = JSON.parse(this.def.data.data || "[]");
            if (parsedData.length > 0) {
                headers = Object.keys(parsedData[0]);
            }
        } catch (e) {
            return "";
        }

        const showHeaders = this.def.data.showHeaders !== false;
        let md = "";
        if (showHeaders && headers.length > 0) {
            md += "| " + headers.join(" | ") + " |\n";
            md += "| " + headers.map(() => "---").join(" | ") + " |\n";
        }
        parsedData.forEach(row => {
            md += "| " + headers.map(h => row[h] || "").join(" | ") + " |\n";
        });
        return md;
    }
}
