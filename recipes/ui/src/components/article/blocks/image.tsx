import React, { useState } from 'react';
import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Image, Text, Input } from '@chakra-ui/react';

export interface ImageData {
    url: string;
    alt?: string;
    caption?: string;
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
        // Technically it is representable but it is very disruptive ot make it so
        return false;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        const alt = this.def.data.alt || "";
        const caption = this.def.data.caption ? ` "${this.def.data.caption}"` : "";
        return `![${alt}](${this.def.data.url}${caption})`;
    }
}

function ImageEditor({ block }: { block: ImageBlock }) {
    const [url, setUrl] = useState(block.def.data.url || "");
    const [alt, setAlt] = useState(block.def.data.alt || "");

    return (
        <Box>
            {(
                <Box mt={4}>
                    <Image src={url} alt={alt} maxW="100%" borderRadius="md" />
                </Box>
            )}
        </Box>
    );
}
