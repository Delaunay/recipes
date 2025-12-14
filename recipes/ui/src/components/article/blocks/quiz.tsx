import React, { useState } from 'react';
import { BlockBase, BlockDef, MarkdownGeneratorContext } from "../base";
import { Box, Text, RadioGroup } from '@chakra-ui/react';

export interface QuizData {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

export interface QuizBlockDef extends BlockDef {
    kind: "quiz";
    data: QuizData;
}

export class QuizBlock extends BlockBase {
    static kind = "quiz";

    static {
        this.register();
    }

    component(mode: string): React.ReactNode {
        return <QuizDisplay block={this} mode={mode} />;
    }

    is_md_representable(): boolean {
        return false;
    }

    as_markdown(ctx: MarkdownGeneratorContext): string {
        return "";
    }
}

function QuizDisplay({ block, mode }: { block: QuizBlock, mode: string }) {
    const [selected, setSelected] = useState<string | undefined>(undefined);
    const [showAnswer, setShowAnswer] = useState(false);

    const handleSelect = (details: { value: string }) => {
        setSelected(details.value);
        setShowAnswer(true);
    };

    const isCorrect = selected !== undefined && parseInt(selected) === block.def.data.correctAnswer;

    return (
        <Box p={4} border="1px solid" borderColor="gray.300" borderRadius="md">
            <Text fontWeight="bold" mb={3}>{block.def.data.question}</Text>
            <RadioGroup.Root value={selected} onValueChange={handleSelect}>
                <Box display="flex" flexDirection="column" gap={2}>
                    {block.def.data.options.map((option, idx) => (
                        <RadioGroup.Item key={idx} value={idx.toString()}>
                            <RadioGroup.ItemHiddenInput />
                            <RadioGroup.ItemText>{option}</RadioGroup.ItemText>
                        </RadioGroup.Item>
                    ))}
                </Box>
            </RadioGroup.Root>
            {showAnswer && (
                <Box mt={4} p={3} bg={isCorrect ? "green.50" : "red.50"} borderRadius="md">
                    <Text fontWeight="bold" color={isCorrect ? "green.700" : "red.700"}>
                        {isCorrect ? "Correct!" : "Incorrect"}
                    </Text>
                    {block.def.data.explanation && (
                        <Text mt={2} fontSize="sm">{block.def.data.explanation}</Text>
                    )}
                </Box>
            )}
        </Box>
    );
}
