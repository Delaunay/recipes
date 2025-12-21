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
        return <VideoEditor block={this} />;
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
    return (
        <Box>
            {url && (
                <Box mt={4}>
                    <video src={url} controls style={{ width: "100%", borderRadius: "8px" }} />
                </Box>
            )}
        </Box>
    );
}
