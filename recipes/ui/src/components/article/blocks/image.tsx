import React, { useState } from 'react';
import { BlockBase, BlockDef, MarkdownGeneratorContext, BlockSetting } from "../base";
import { Box, Image, Text, Input } from '@chakra-ui/react';

export interface ImageData {
    url: string;
    alt?: string;
    caption?: string;
    width?: string
    height?: string
}

export interface ImageBlockDef extends BlockDef {
    kind: "image";
    data: ImageData;
}

export class ImageBlock extends BlockBase {
    static kind = "image";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        if (mode === "edit") {
            return <ImageEditor block={this} />;
        }
        return <ImageEditor block={this} />; 
    }

    is_md_representable(): boolean {
        // Technically it is representable but it is svery disruptive ot make it so
        return false;
    }

    settings(): BlockSetting {
        return {
            url:    { "type": "string", "required": false },
            alt:    { "type": "string", "required": false },
            caption:{ "type": "string", "required": false },
            width:  { "type": "int"   , "required": false },
            height: { "type": "int"   , "required": false },
        }
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        const alt = this.def.data.alt || "";
        const caption = this.def.data.caption ? ` "${this.def.data.caption}"` : "";
        return `![${alt}](${this.def.data.url}${caption})`;
    }
}

function ImageEditor({ block }: { block: ImageBlock }) {
    return (
        <Box>
            {(
                <Box mt={4}>
                    <Image 
                        src={block.def.data.url}
                        alt={block.def.data.alt} 
                        maxW="100%" 
                        width={block.def.data.width} 
                        height={block.def.data.height}
                        borderRadius="md" />
                </Box>
            )}
        </Box>
    );
}
