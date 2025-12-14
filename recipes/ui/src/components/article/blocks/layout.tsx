import { block } from "blockly/core/tooltip";
import {BlockBase, BlockDef, MarkdownGeneratorContext} from "../base";
import { HStack, Text, Box } from '@chakra-ui/react';
import React from "react";
import { ItemBlock } from "./item";

export interface LayoutData {
    layout: string;
    column: number;
  }
  
export interface LayoutBlockDef extends BlockDef {
    kind: "layout";
    data: LayoutData;
}

function range(n: number) {
    return Array.from({ length: n }, (_, i) => i);
  }
  

export class LayoutBlock extends BlockBase {
    static kind = "layout";

    static {
        this.register();
    }

    placeholder(): React.ReactNode {
        return <div></div>
    }

    column(mode: string, n: number): React.ReactNode {
        while (this.children.length < n) {
            this.children.push(new ItemBlock(this.article, {}));
        }
        
        return <HStack   
            gap={4}
            align="stretch"
            flexDirection={{ base: "column", md: "row" }}
            flex="1"
            minH={0}
            width="100%"
            >
            {range(n).map(i => {
                const child = this.children[i];
                return (
                <Box key={i} flex="1" minH="50px" alignSelf="stretch">
                    {child ? child.react(): this.placeholder()}
                </Box>)
            })}
        </HStack>
    }

    component(mode: string): React.ReactNode {
        switch(this.def.data.layout) {
            case "column":
                return this.column(mode, this.def.data.column)
                
        }
        return this.column(mode, this.def.data.column)
    }

    is_md_representable(): boolean {
        return false;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        return `${this.def.data.text} ${this.children.map(child => child.as_markdown(ctx)).join(" ")}`
    }
}

