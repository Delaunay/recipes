import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, Button, HStack, VStack } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

export const BlocklyBlock: React.FC<BlockComponentProps> = ({ block, readonly }) => {
    const blocklyDiv = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<any>(null);
    const [generatedCode, setGeneratedCode] = useState('');
    const [output, setOutput] = useState('');
    const [showCode, setShowCode] = useState(false);

    const toolbox = block.data?.toolbox;
    const initialBlocks = block.data?.blocks;
    const caption = block.data?.caption;
    const height = block.data?.height || 400;
    const language = block.data?.language || 'JavaScript';

    useEffect(() => {
        if (!blocklyDiv.current) return;

        let Blockly: any;
        let workspace: any;

        const initBlockly = async () => {
            try {
                // Dynamic import of Blockly
                Blockly = await import('blockly');
                const { javascriptGenerator } = await import('blockly/javascript');

                // Default toolbox if none provided
                const defaultToolbox = {
                    kind: 'categoryToolbox',
                    contents: [
                        {
                            kind: 'category',
                            name: 'Logic',
                            colour: '210',
                            contents: [
                                { kind: 'block', type: 'controls_if' },
                                { kind: 'block', type: 'logic_compare' },
                                { kind: 'block', type: 'logic_operation' },
                                { kind: 'block', type: 'logic_boolean' }
                            ]
                        },
                        {
                            kind: 'category',
                            name: 'Loops',
                            colour: '120',
                            contents: [
                                { kind: 'block', type: 'controls_repeat_ext' },
                                { kind: 'block', type: 'controls_whileUntil' },
                                { kind: 'block', type: 'controls_for' }
                            ]
                        },
                        {
                            kind: 'category',
                            name: 'Math',
                            colour: '230',
                            contents: [
                                { kind: 'block', type: 'math_number' },
                                { kind: 'block', type: 'math_arithmetic' },
                                { kind: 'block', type: 'math_single' }
                            ]
                        },
                        {
                            kind: 'category',
                            name: 'Text',
                            colour: '160',
                            contents: [
                                { kind: 'block', type: 'text' },
                                { kind: 'block', type: 'text_print' }
                            ]
                        },
                        {
                            kind: 'category',
                            name: 'Variables',
                            colour: '330',
                            custom: 'VARIABLE'
                        }
                    ]
                };

                // Initialize workspace
                workspace = Blockly.inject(blocklyDiv.current, {
                    toolbox: toolbox || defaultToolbox,
                    scrollbars: true,
                    trashcan: true,
                    zoom: {
                        controls: true,
                        wheel: true,
                        startScale: 1.0,
                        maxScale: 3,
                        minScale: 0.3,
                        scaleSpeed: 1.2
                    },
                    readOnly: readonly,
                    move: {
                        scrollbars: true,
                        drag: !readonly,
                        wheel: true
                    }
                });

                workspaceRef.current = workspace;

                // Load initial blocks if provided
                if (initialBlocks) {
                    try {
                        Blockly.serialization.workspaces.load(initialBlocks, workspace);
                    } catch (err) {
                        console.error('Error loading blocks:', err);
                    }
                }

                // Generate code on workspace change
                if (readonly) {
                    workspace.addChangeListener(() => {
                        try {
                            const code = javascriptGenerator.workspaceToCode(workspace);
                            setGeneratedCode(code);
                        } catch (err) {
                            console.error('Error generating code:', err);
                        }
                    });

                    // Initial code generation
                    try {
                        const code = javascriptGenerator.workspaceToCode(workspace);
                        setGeneratedCode(code);
                    } catch (err) {
                        console.error('Error generating initial code:', err);
                    }
                }
            } catch (err) {
                console.error('Error initializing Blockly:', err);
            }
        };

        initBlockly();

        // Cleanup
        return () => {
            if (workspaceRef.current) {
                workspaceRef.current.dispose();
            }
        };
    }, [toolbox, initialBlocks, readonly]);

    const runCode = () => {
        if (!generatedCode) {
            setOutput('No code to execute');
            return;
        }

        try {
            // Capture console.log
            const logs: string[] = [];
            const originalLog = console.log;
            console.log = (...args) => {
                logs.push(args.map(a => String(a)).join(' '));
            };

            try {
                // Execute generated code
                const result = eval(generatedCode);
                if (result !== undefined) {
                    logs.push(`Result: ${result}`);
                }
            } finally {
                console.log = originalLog;
            }

            setOutput(logs.join('\n') || 'Code executed successfully (no output)');
        } catch (err: any) {
            setOutput(`Error: ${err.message}`);
        }
    };

    return (
        <Box mb={4}>
            {caption && (
                <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
                    {caption}
                </Text>
            )}

            <VStack align="stretch" gap={2}>
                {/* Blockly Workspace */}
                <Box
                    border="1px solid"
                    borderColor="gray.300"
                    borderRadius="md"
                    overflow="hidden"
                >
                    <div
                        ref={blocklyDiv}
                        style={{
                            height: `${height}px`,
                            width: '100%'
                        }}
                    />
                </Box>

                {/* Controls */}
                {readonly && (
                    <HStack gap={2} justifyContent="space-between" flexWrap="wrap">
                        <HStack gap={2}>
                            <Button size="sm" colorScheme="green" onClick={runCode}>
                                ▶ Run Code
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowCode(!showCode)}>
                                {showCode ? 'Hide' : 'Show'} Code
                            </Button>
                        </HStack>
                        <Text fontSize="xs" color="gray.500">
                            {language} • Blockly Visual Programming
                        </Text>
                    </HStack>
                )}

                {/* Generated Code */}
                {readonly && showCode && generatedCode && (
                    <Box
                        p={3}
                        bg="gray.900"
                        borderRadius="md"
                        fontFamily="monospace"
                        fontSize="xs"
                        color="white"
                        whiteSpace="pre-wrap"
                        maxHeight="300px"
                        overflowY="auto"
                    >
                        {generatedCode}
                    </Box>
                )}

                {/* Output */}
                {readonly && output && (
                    <Box
                        p={3}
                        bg={output.startsWith('Error:') ? 'red.50' : 'green.50'}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={output.startsWith('Error:') ? 'red.200' : 'green.200'}
                    >
                        <Text fontSize="xs" fontWeight="600" color={output.startsWith('Error:') ? 'red.700' : 'green.700'} mb={1}>
                            {output.startsWith('Error:') ? 'Error:' : 'Output:'}
                        </Text>
                        <Box
                            fontFamily="monospace"
                            fontSize="xs"
                            color={output.startsWith('Error:') ? 'red.800' : 'green.900'}
                            whiteSpace="pre-wrap"
                        >
                            {output.replace(/^Error:\s*/, '')}
                        </Box>
                    </Box>
                )}
            </VStack>
        </Box>
    );
};

