import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

export const DefinitionBlock: React.FC<BlockComponentProps> = ({ block }) => {
    const term = block.data?.term || '';
    const definition = block.data?.definition || '';
    const pronunciation = block.data?.pronunciation;
    const partOfSpeech = block.data?.partOfSpeech;

    return (
        <Box
            mb={4}
            p={4}
            bg="blue.50"
            borderLeft="4px solid"
            borderLeftColor="blue.500"
            borderRadius="md"
        >
            <Box display="flex" alignItems="baseline" gap={2} mb={2}>
                <Text fontSize="lg" fontWeight="700" color="blue.900">
                    {term}
                </Text>
                {pronunciation && (
                    <Text fontSize="sm" color="gray.600" fontStyle="italic">
                        /{pronunciation}/
                    </Text>
                )}
                {partOfSpeech && (
                    <Text fontSize="xs" color="blue.700" fontWeight="600" px={2} py={0.5} bg="blue.100" borderRadius="sm">
                        {partOfSpeech}
                    </Text>
                )}
            </Box>
            <Text fontSize="sm" color="gray.800" lineHeight="1.6">
                {definition}
            </Text>
        </Box>
    );
};


