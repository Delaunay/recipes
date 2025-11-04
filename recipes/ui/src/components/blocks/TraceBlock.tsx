import React, { useState } from 'react';
import { Box, Text, HStack, VStack } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

interface TraceStep {
    timestamp: number;
    function: string;
    line?: number;
    variables?: Record<string, any>;
    type: 'call' | 'return' | 'log' | 'error';
    message?: string;
}

export const TraceBlock: React.FC<BlockComponentProps> = ({ block, readonly }) => {
    const steps: TraceStep[] = block.data?.steps || [];
    const caption = block.data?.caption;

    const [selectedStep, setSelectedStep] = useState<number | null>(null);

    const getStepColor = (type: string) => {
        switch (type) {
            case 'call': return { bg: 'blue.50', border: 'blue.500', icon: '→' };
            case 'return': return { bg: 'green.50', border: 'green.500', icon: '←' };
            case 'log': return { bg: 'gray.50', border: 'gray.400', icon: '📝' };
            case 'error': return { bg: 'red.50', border: 'red.500', icon: '❌' };
            default: return { bg: 'gray.50', border: 'gray.300', icon: '•' };
        }
    };

    if (steps.length === 0) {
        return (
            <Box mb={4} p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    No trace steps defined
                </Text>
            </Box>
        );
    }

    return (
        <Box mb={4}>
            {caption && (
                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                    {caption}
                </Text>
            )}

            <Box border="1px solid" borderColor="gray.200" borderRadius="md" overflow="hidden">
                <VStack align="stretch" gap={0}>
                    {steps.map((step, index) => {
                        const colors = getStepColor(step.type);
                        const isSelected = selectedStep === index;

                        return (
                            <Box key={index}>
                                <HStack
                                    p={3}
                                    bg={isSelected ? colors.bg : 'white'}
                                    borderLeft="4px solid"
                                    borderLeftColor={colors.border}
                                    borderBottom="1px solid"
                                    borderBottomColor="gray.100"
                                    cursor={readonly ? 'pointer' : 'default'}
                                    _hover={readonly ? { bg: colors.bg } : {}}
                                    onClick={() => readonly && setSelectedStep(isSelected ? null : index)}
                                    gap={3}
                                >
                                    <Text fontSize="xs" color="gray.400" minWidth="60px" fontFamily="monospace">
                                        {step.timestamp}ms
                                    </Text>
                                    <Text fontSize="lg" minWidth="20px">
                                        {colors.icon}
                                    </Text>
                                    <Box flex={1}>
                                        <HStack gap={2}>
                                            <Text fontSize="sm" fontWeight="600" color="gray.800" fontFamily="monospace">
                                                {step.function}
                                            </Text>
                                            {step.line && (
                                                <Text fontSize="xs" color="gray.500">
                                                    :line {step.line}
                                                </Text>
                                            )}
                                        </HStack>
                                        {step.message && (
                                            <Text fontSize="xs" color="gray.600" mt={1}>
                                                {step.message}
                                            </Text>
                                        )}
                                    </Box>
                                </HStack>

                                {isSelected && step.variables && (
                                    <Box p={3} bg="gray.50" borderBottom="1px solid" borderBottomColor="gray.200">
                                        <Text fontSize="xs" fontWeight="600" color="gray.700" mb={2}>
                                            Variables:
                                        </Text>
                                        <Box
                                            fontFamily="monospace"
                                            fontSize="xs"
                                            color="gray.700"
                                            bg="gray.100"
                                            p={2}
                                            borderRadius="md"
                                        >
                                            {Object.entries(step.variables).map(([key, value]) => (
                                                <Box key={key} mb={1}>
                                                    <Text as="span" color="purple.600">{key}</Text>
                                                    <Text as="span" color="gray.500"> = </Text>
                                                    <Text as="span" color="blue.600">
                                                        {JSON.stringify(value)}
                                                    </Text>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </VStack>
            </Box>
        </Box>
    );
};


