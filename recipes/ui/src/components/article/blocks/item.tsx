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
    static kind = "item";
 
    static {
        this.register(); 
    }

    constructor(owner: any, block: BlockDef) {
        super(owner, block);
        
    }

    component(mode: string) {
        if (this.children.length > 0) {
            return <>{this.children.map(child => child.component(mode))}</>
        }
        return <Box flex="1" minH="50px" display="flex" border="1px solid"></Box>
    }

    is_md_representable(): boolean {
        return true;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        return this.children.map(child => child.as_markdown(ctx)).join(" ");
    }
}
