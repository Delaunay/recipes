import React from 'react';
import { Box, Code, Text } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

export const LatexBlock: React.FC<BlockComponentProps> = ({ block }) => {
    const formula = block.data?.formula || 'E = mc^2';

    return (
        <Box mb={4} p={4} bg="purple.50" borderRadius="md" borderLeft="4px solid" borderColor="purple.400">
            <Text fontSize="xs" fontWeight="bold" color="purple.700" mb={2}>
                LaTeX Formula
            </Text>
            <Code display="block" p={2} bg="white" borderRadius="sm" fontFamily="monospace">
                {formula}
            </Code>
            <Text fontSize="xs" color="gray.500" mt={2}>
                (LaTeX rendering would be displayed here with a library like KaTeX or MathJax)
            </Text>
        </Box>
    );
};

