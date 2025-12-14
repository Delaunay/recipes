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
        return (
            <Box>
                <Image
                    src={this.def.data.url}
                    alt={this.def.data.alt || ""}
                    maxW="100%"
                    borderRadius="md"
                />
                {this.def.data.caption && (
                    <Text fontSize="sm" color="gray.600" mt={2} textAlign="center">
                        {this.def.data.caption}
                    </Text>
                )}
            </Box>
        );
    }

    is_md_representable(): boolean {
        return true;
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
    const [caption, setCaption] = useState(block.def.data.caption || "");

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
        block.def.data.url = e.target.value;
        block.version += 1;
    };

    const handleAltChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAlt(e.target.value);
        block.def.data.alt = e.target.value;
        block.version += 1;
    };

    const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCaption(e.target.value);
        block.def.data.caption = e.target.value;
        block.version += 1;
    };

    return (
        <Box>
            <Input
                value={url}
                onChange={handleUrlChange}
                placeholder="Image URL"
                mb={2}
            />
            <Input
                value={alt}
                onChange={handleAltChange}
                placeholder="Alt text"
                mb={2}
            />
            <Input
                value={caption}
                onChange={handleCaptionChange}
                placeholder="Caption (optional)"
            />
            {url && (
                <Box mt={4}>
                    <Image src={url} alt={alt} maxW="100%" borderRadius="md" />
                </Box>
            )}
        </Box>
    );
}
