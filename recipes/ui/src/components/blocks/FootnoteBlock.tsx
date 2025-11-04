import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

export const FootnoteBlock: React.FC<BlockComponentProps> = ({ block }) => {
    const number = block.data?.number || '1';
    const text = block.data?.text || 'Footnote text';

    return (
        <Box mb={2} fontSize="sm" color="gray.600">
            <Text as="sup" fontWeight="bold" mr={1}>
                [{number}]
            </Text>
            <Text as="span">{text}</Text>
        </Box>
    );
};


