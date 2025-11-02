import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

export const ReferenceBlock: React.FC<BlockComponentProps> = ({ block }) => {
    const citation = block.data?.citation || 'Author, Year. Title.';

    return (
        <Box mb={3} pl={4} borderLeft="3px solid" borderColor="gray.300" fontStyle="italic">
            <Text fontSize="sm" color="gray.700">
                {citation}
            </Text>
        </Box>
    );
};

