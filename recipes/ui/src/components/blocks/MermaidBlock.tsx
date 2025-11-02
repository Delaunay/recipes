import React from 'react';
import { Box, Code, Text } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

export const MermaidBlock: React.FC<BlockComponentProps> = ({ block }) => {
    const diagram = block.data?.diagram || 'graph TD\n  A --> B';

    return (
        <Box mb={4} p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.400">
            <Text fontSize="xs" fontWeight="bold" color="blue.700" mb={2}>
                Mermaid Diagram
            </Text>
            <Code
                display="block"
                whiteSpace="pre"
                p={2}
                bg="white"
                borderRadius="sm"
                fontFamily="monospace"
                fontSize="sm"
            >
                {diagram}
            </Code>
            <Text fontSize="xs" color="gray.500" mt={2}>
                (Mermaid diagram would be rendered here with the Mermaid library)
            </Text>
        </Box>
    );
};

