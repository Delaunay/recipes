import React, { useState, useRef } from 'react';
import { Box, Heading, ListItem } from '@chakra-ui/react';
import { Input, List } from '@chakra-ui/react';

import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";


export interface ListData {
    items: string[];
    level: number;
}

export interface ListBlockDef extends BlockDef {
    kind: "list";
    data: ListData;
}

export class ListBlock extends BlockBase {
    static kind = "list";

    static {
        this.register();
    }

    constructor(owner: any, block: BlockDef) {
        super(owner, block);

    }

    component(mode: string) {
        return <ListDisplay block={this} mode={mode}></ListDisplay>
    }

    is_md_representable(): boolean {
        return true;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        const indent = "  ".repeat(ctx.level);


        const items = this.def.data.items ? 
            this.def.data.items.map(item => {
                return `${indent}* ${item}`
            })
            .join("\n"):
            "";

        const childrenMd = this.children
            .map(child => {
                if (child.def.kind === "list") {
                    return `${child.as_markdown(ctx.inc())}`
                }
                return `${indent}* ${child.as_markdown(ctx.inc())}`
            })
            .join("\n");

        if (this.def.data.items?.length) {
            return [items, childrenMd].join("\n");
        }

        return childrenMd;
    }
}



function ListDisplay({ block, mode }: { block: ListBlock, mode: string }) {
    const listItemComponent = (child) => {
        if (child.def.kind == "list")
            return child.component("view")
        return <List.Item key={child.def.id}>{child.component("view")}</List.Item>
    }

    return (
        <List.Root ps="5">
            {block.def.data.items?.map((text: string) => (
                <List.Item>{text}</List.Item>
            ))}
            {block.children.map((child) => (
                listItemComponent(child)
            ))}
        </List.Root>
    )
}