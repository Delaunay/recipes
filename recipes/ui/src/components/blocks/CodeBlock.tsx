import React from 'react';
import { Box, Code } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

export const CodeBlock: React.FC<BlockComponentProps> = ({ block }) => {
    const code = block.data?.code || '// Code here';
    const language = block.data?.language || 'javascript';

    return (
        <Box mb={4}>
            <Code
                display="block"
                whiteSpace="pre"
                p={4}
                bg="gray.900"
                color="green.300"
                borderRadius="md"
                fontFamily="monospace"
                fontSize="sm"
                overflowX="auto"
            >
                {code}
            </Code>
            {language && (
                <Box
                    fontSize="xs"
                    color="gray.500"
                    mt={1}
                    textAlign="right"
                >
                    {language}
                </Box>
            )}
        </Box>
    );
};

