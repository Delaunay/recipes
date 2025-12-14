import React, { useState } from 'react';
import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Text, Input } from '@chakra-ui/react';

export interface AudioData {
    url: string;
    caption?: string;
}

export interface AudioBlockDef extends BlockDef {
    kind: "audio";
    data: AudioData;
}

export class AudioBlock extends BlockBase {
    static kind = "audio";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        if (mode === "edit") {
            return <AudioEditor block={this} />;
        }
        return (
            <Box>
                <audio
                    src={this.def.data.url}
                    controls
                    style={{ width: "100%" }}
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
        return false;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        return "";
    }
}

function AudioEditor({ block }: { block: AudioBlock }) {
    const [url, setUrl] = useState(block.def.data.url || "");
    const [caption, setCaption] = useState(block.def.data.caption || "");

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(e.target.value);
        block.def.data.url = e.target.value;
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
                placeholder="Audio URL"
                mb={2}
            />
            <Input
                value={caption}
                onChange={handleCaptionChange}
                placeholder="Caption (optional)"
            />
            {url && (
                <Box mt={4}>
                    <audio src={url} controls style={{ width: "100%" }} />
                </Box>
            )}
        </Box>
    );
}
