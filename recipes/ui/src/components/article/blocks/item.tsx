import React, { useState, useRef } from 'react';
import { Box, Heading, ListItem } from '@chakra-ui/react';
import { Input, List } from '@chakra-ui/react';

import {BlockBase, BlockDef, MarkdownGeneratorContext} from "../base";


export interface ItemData {
    items: string[];
    level: number;
  }
  
export interface ItemBlockDef extends BlockDef {
    kind: "item";
    data: ItemData;
  }

export class ItemBlock extends BlockBase {
    // Item block holds a group of children
    static kind = "item";
 
    static {
        this.register(); 
    }

    component(mode: string) {
        if (this.children.length > 0) {
            // This makes the component editable
            // but if the item block as its own BlockWrapper a lot of things overlap
            return <>{this.children.map(child => child.react())}</>

            // This is the component unwrapped by the BlockWrapper
            // this makes the children not EDITABLE
            return <>{this.children.map(child => child.component(mode))}</>
        }
        return <Box flex="1" minH="50px" display="flex" border="1px solid"></Box>
    }

    is_md_representable(): boolean {
        // if it is empty, we can use markdown to insert children to this
        // if it is NOT empty, then we can use the existing blocks to insert things
        return this.children.length === 0;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        return this.children.map(child => child.as_markdown(ctx)).join("\n\n");
    }
}
