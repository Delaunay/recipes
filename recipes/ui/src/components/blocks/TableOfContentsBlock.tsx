import React, { useMemo } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';
import { ArticleBlock } from '../../services/type';

interface TOCItem {
    id: number | undefined;
    level: number;
    text: string;
}

export const TableOfContentsBlock: React.FC<BlockComponentProps> = ({ block }) => {
    // Get all blocks from the article (passed via extension data)
    const allBlocks = block.data?.allBlocks || [];
    const maxLevel = block.data?.maxLevel || 3; // Default: show headings up to level 3
    const title = block.data?.title || 'Table of Contents';

    // Extract all headings from the article blocks (recursive)
    const tocItems = useMemo(() => {
        const items: TOCItem[] = [];

        const extractHeadings = (blocks: ArticleBlock[]) => {
            blocks.forEach((blk) => {
                if (blk.kind === 'heading') {
                    const level = blk.data?.level || 1;
                    const text = blk.data?.text || 'Untitled';

                    // Only include headings up to maxLevel
                    if (level <= maxLevel) {
                        items.push({
                            id: blk.id,
                            level,
                            text
                        });
                    }
                }

                // Recursively check children
                if (blk.children && blk.children.length > 0) {
                    extractHeadings(blk.children);
                }
            });
        };

        extractHeadings(allBlocks);
        return items;
    }, [allBlocks, maxLevel]);

    const handleClick = (id: number | undefined) => {
        if (id) {
            // Scroll to the heading element
            const element = document.querySelector(`[data-block-id="${id}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    return (
        <Box
            mb={6}
            p={4}
            bg="blue.50"
            borderRadius="md"
            borderLeft="4px solid"
            borderColor="blue.400"
        >
            <Text fontSize="md" fontWeight="bold" color="blue.900" mb={3}>
                {title}
            </Text>

            {tocItems.length === 0 ? (
                <Text fontSize="sm" color="gray.600" fontStyle="italic">
                    No headings found in the article
                </Text>
            ) : (
                <VStack align="stretch" gap={1}>
                    {tocItems.map((item, index) => {
                        // Calculate indentation based on heading level
                        const indent = (item.level - 1) * 20;

                        return (
                            <Box
                                key={index}
                                pl={`${indent}px`}
                                cursor="pointer"
                                _hover={{
                                    color: 'blue.600',
                                    textDecoration: 'underline'
                                }}
                                onClick={() => handleClick(item.id)}
                            >
                                <Text
                                    fontSize={item.level === 1 ? 'sm' : 'xs'}
                                    fontWeight={item.level === 1 ? 'semibold' : 'normal'}
                                    color="blue.800"
                                >
                                    {item.text}
                                </Text>
                            </Box>
                        );
                    })}
                </VStack>
            )}
        </Box>
    );
};

