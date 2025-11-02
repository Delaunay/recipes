import React from 'react';
import { Box } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

export const ListBlock: React.FC<BlockComponentProps> = ({ block }) => {
    const items = block.data?.items || [];
    const ordered = block.data?.ordered || false;

    return (
        <Box
            as={ordered ? 'ol' : 'ul'}
            mb={4}
            pl={6}
            css={{
                '& li': {
                    marginBottom: '0.5rem'
                }
            }}
        >
            {items.map((item: string, index: number) => (
                <li key={index}>{item}</li>
            ))}
        </Box>
    );
};

