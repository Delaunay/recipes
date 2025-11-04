import React, { useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
    </svg>
);

export const AccordionBlock: React.FC<BlockComponentProps> = ({ block, readonly }) => {
    const items = block.data?.items || [];
    const allowMultiple = block.data?.allowMultiple !== false;
    const defaultExpanded = block.data?.defaultExpanded || [];

    const [expandedItems, setExpandedItems] = useState<number[]>(defaultExpanded);

    const toggleItem = (index: number) => {
        if (readonly) return;

        setExpandedItems(prev => {
            if (prev.includes(index)) {
                // Collapse this item
                return prev.filter(i => i !== index);
            } else {
                // Expand this item
                if (allowMultiple) {
                    return [...prev, index];
                } else {
                    // Only one item can be expanded at a time
                    return [index];
                }
            }
        });
    };

    return (
        <Box mb={4}>
            {items.map((item: { title: string; content: string }, index: number) => {
                const isExpanded = expandedItems.includes(index);

                return (
                    <Box
                        key={index}
                        mb={2}
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        overflow="hidden"
                    >
                        {/* Accordion Header */}
                        <Box
                            px={4}
                            py={3}
                            bg={isExpanded ? 'gray.50' : 'white'}
                            cursor={readonly ? 'default' : 'pointer'}
                            _hover={readonly ? {} : { bg: 'gray.50' }}
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            onClick={() => toggleItem(index)}
                            transition="background-color 0.15s"
                        >
                            <Text fontWeight="600" color="gray.800" fontSize="sm">
                                {item.title}
                            </Text>
                            <Box
                                color="gray.500"
                                transition="transform 0.2s"
                                css={{
                                    transform: isExpanded ? 'rotate(0deg)' : 'rotate(0deg)'
                                }}
                            >
                                {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                            </Box>
                        </Box>

                        {/* Accordion Content */}
                        {isExpanded && (
                            <Box
                                px={4}
                                py={3}
                                bg="white"
                                borderTop="1px solid"
                                borderColor="gray.100"
                            >
                                <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap">
                                    {item.content}
                                </Text>
                            </Box>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
};


