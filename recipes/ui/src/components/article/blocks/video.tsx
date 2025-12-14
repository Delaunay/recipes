import React, { useState } from 'react';
import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Text, Input } from '@chakra-ui/react';

export interface VideoData {
    url: string;
    caption?: string;
}

export interface VideoBlockDef extends BlockDef {
    kind: "video";
    data: VideoData;
}

export class VideoBlock extends BlockBase {
    static kind = "video";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        if (mode === "edit") {
            return <VideoEditor block={this} />;
        }
        return (
            <Box>
                <video
                    src={this.def.data.url}
                    controls
                    style={{ width: "100%", borderRadius: "8px" }}
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

function VideoEditor({ block }: { block: VideoBlock }) {
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
                placeholder="Video URL"
                mb={2}
            />
            <Input
                value={caption}
                onChange={handleCaptionChange}
                placeholder="Caption (optional)"
            />
            {url && (
                <Box mt={4}>
                    <video src={url} controls style={{ width: "100%", borderRadius: "8px" }} />
                </Box>
            )}
        </Box>
    );
}
