import {BlockBase, BlockDef, MarkdownGeneratorContext} from "../base";
import { Text } from '@chakra-ui/react';

export interface ParagraphData {
    text: string;
  }
  
export interface ParagraphBlockDef extends BlockDef {
    kind: "paragraph";
    data: ParagraphData;
}

export class ParagraphBlock extends BlockBase {
    static kind = "paragraph";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        // This output <p>
        return <Text key={this.def.id}>
            {this.def.data.text}
            {this.children.map(child => child.component(mode))}
        </Text>
    }

    is_md_representable(): boolean {
        return true;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        if (this.def.data.text) {
            return `${this.def.data.text} ${this.children.map(child => child.as_markdown(ctx)).join(" ")}`
        } else {
            return `${this.children.map(child => child.as_markdown(ctx)).join(" ")}`
        }
    }
}

