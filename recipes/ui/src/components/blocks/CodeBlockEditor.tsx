import React from 'react';
import { Box, VStack, Text, Input, Textarea } from '@chakra-ui/react';
import { BlockEditorProps } from './BlockTypes';

export const CodeBlockEditor: React.FC<BlockEditorProps> = ({ block, onChange }) => {
    return (
        <VStack gap={2} align="stretch">
            <Box>
                <Text fontSize="xs" fontWeight="medium" mb={1}>Language:</Text>
                <Input
                    value={block.data?.language || ''}
                    onChange={(e) => onChange('language', e.target.value)}
                    placeholder="e.g., javascript, python..."
                    size="sm"
                />
            </Box>
            <Box>
                <Text fontSize="xs" fontWeight="medium" mb={1}>Code:</Text>
                <Textarea
                    value={block.data?.code || ''}
                    onChange={(e) => onChange('code', e.target.value)}
                    placeholder="Enter code..."
                    fontFamily="monospace"
                    size="sm"
                    minHeight="150px"
                />
            </Box>
        </VStack>
    );
};

