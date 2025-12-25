import {BlockBase, BlockDef,MarkdownGeneratorContext } from "../base";
import { Text } from '@chakra-ui/react';

export interface TextData {
    text: string;
    style?: string;
  }
  
export interface TextBlockDef extends BlockDef {
    kind: "text";
    data: TextData;
}

export class TextBlock extends BlockBase {
    static kind = "text";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        // I don't like this the markdown parser should generate only leaf for text
        if (this.children.length > 0) {
            return this.children.map(child => child.component(mode))
        }

        // this also generate <p>
        switch (this.def.data.style) {
            case "strong":
                return <b key={`txt-${this.key}`}>{this.def.data.text}</b>
        }
        return <span key={`txt-${this.key}`}>{this.def.data.text}</span>
    }

    is_md_representable(): boolean {
        return true;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        switch (this.def.data.style) {
            case "strong":
                return `__${this.def.data.text}__`
        }
        return `${this.def.data.text}`
    }
}

