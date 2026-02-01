import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Link } from '@chakra-ui/react';
import React from 'react';

export interface LinkData {
    text: string;
    url: string;
    title?: string;
}

export interface LinkBlockDef extends BlockDef {
    kind: "link";
    data: LinkData;
}

export class LinkBlock extends BlockBase {
    static kind = "link";

    static {
        this.register();
    }

    component(_mode: string): React.ReactNode {
        return (
            <Link key={`lnk-${this.key}`} href={this.def.data.url} title={this.def.data.title} color="blue.500" target="_blank" rel="noopener noreferrer">
                {this.def.data.text}
            </Link>
        );
    }

    is_md_representable(): boolean {
        return true;
    }

    as_markdown(_ctx: MarkdownGeneratorContext): string {
        if (this.def.data.title) {
            return `[${this.def.data.text}](${this.def.data.url} "${this.def.data.title}")`
        }
        return `[${this.def.data.text}](${this.def.data.url})`
    }
}
