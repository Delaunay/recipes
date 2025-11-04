import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

export const CitationBlock: React.FC<BlockComponentProps> = ({ block }) => {
    const author = block.data?.author || '';
    const year = block.data?.year || '';
    const text = block.data?.text || '';
    const page = block.data?.page;

    return (
        <Box
            mb={4}
            p={4}
            bg="gray.50"
            borderLeft="4px solid"
            borderLeftColor="gray.400"
            borderRadius="md"
            position="relative"
        >
            <Text fontSize="3xl" color="gray.300" position="absolute" top="2" left="3" fontFamily="serif">
                "
            </Text>
            <Box pl={6} pr={2} pt={2}>
                <Text fontSize="md" color="gray.800" lineHeight="1.7" fontStyle="italic" mb={3}>
                    {text}
                </Text>
                <Text fontSize="sm" color="gray.600" textAlign="right">
                    — {author}{year && `, ${year}`}{page && `, p. ${page}`}
                </Text>
            </Box>
        </Box>
    );
};


