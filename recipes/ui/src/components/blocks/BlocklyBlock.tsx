import React, { useEffect, useRef, useState } from 'react';
import { Box, VStack, Button, Spinner, Text } from '@chakra-ui/react';
import { BlockComponentProps } from './BlockTypes';

import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
import 'blockly/blocks';
import * as blocks from 'blockly/blocks';
import { buildToolboxFromBlocks } from './blockly/utils';


import { recipeAPI } from '../../services/api';



export const BlocklyBlock: React.FC<BlockComponentProps> = ({ readonly: _readonly }) => {
    const blocklyDiv = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const isInitialized = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const height = 400;

    Blockly.setLocale(En);
    console.log("MSG", Blockly.Msg)

    useEffect(() => {
        if (!blocklyDiv.current || isInitialized.current) return;

        const initWorkspace = async () => {
            console.log('🔧 Initializing Blockly workspace...');
            setIsLoading(true);
            setError(null);

            try {
                // Load standard blocks
                try {
                    await import('blockly/blocks');
                    console.log('✓ Standard blocks loaded');
                } catch (err) {
                    console.warn('⚠ Could not load standard blocks:', err);
                }

                // Fetch block definitions from the backend
                console.log('📥 Fetching block definitions...');
                const definitions = await recipeAPI.getBlocklyDefinitions();
                console.log('✓ Block definitions loaded:', definitions);

                // Fetch toolbox configuration from the backend
                console.log('📥 Fetching toolbox configuration...');
                const toolbox = await recipeAPI.getBlocklyToolbox();
                console.log('✓ Toolbox configuration loaded:', toolbox);

                // Define blocks
                console.log('Creating workspace...');
                if (definitions && Array.isArray(definitions)) {
                    Blockly.common.defineBlocksWithJsonArray(definitions);
                    console.log(`✓ Defined ${definitions.length} blocks`);
                }

                // Inject workspace with the toolbox
                // blocks.blocks might not exist, so fallback to blocks itself or empty object
                // const blocksMap = (blocks as any).blocks || blocks || {};
                console.log( buildToolboxFromBlocks(blocks));
                const workspace = Blockly.inject(blocklyDiv.current!, {
                    toolbox: buildToolboxFromBlocks(blocks)
                });

                console.log('✓ Workspace created and stored in ref');
                workspaceRef.current = workspace;
                isInitialized.current = true;
                setIsLoading(false);
            } catch (err) {
                console.error('❌ Error initializing Blockly workspace:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setIsLoading(false);
            }
        };

        initWorkspace();

        // Cleanup on unmount
        return () => {
            if (workspaceRef.current && isInitialized.current) {
                console.log('🧹 Disposing workspace');
                workspaceRef.current.dispose();
                workspaceRef.current = null;
                isInitialized.current = false;
            }
        };
    }, []); // Empty dependency array - only run once on mount

    const handleSaveWorkspace = () => {
        console.log('💾 Save button clicked!');
        console.log('workspaceRef.current:', workspaceRef.current);

        if (!workspaceRef.current) {
            console.error('❌ No workspace available');
            return;
        }

        try {
            console.log('Attempting to save workspace...', workspaceRef.current);

            // Check what blocks are in the workspace
            const allBlocks = workspaceRef.current.getAllBlocks(false);
            console.log('Number of blocks in workspace:', allBlocks.length);
            console.log('Blocks:', allBlocks);

            if (allBlocks.length > 0) {
                allBlocks.forEach((block, index) => {
                    console.log(`Block ${index}:`, {
                        type: block.type,
                        id: block.id,
                        x: block.getRelativeToSurfaceXY().x,
                        y: block.getRelativeToSurfaceXY().y
                    });
                });
            }

            // Save workspace to JSON
            const json = Blockly.serialization.workspaces.save(workspaceRef.current);

            console.log('='.repeat(60));
            console.log('📦 WORKSPACE SAVED TO JSON:');
            console.log('='.repeat(60));
            console.log(JSON.stringify(json, null, 2));
            console.log('='.repeat(60));

            // Also log as a single line for easy copying
            console.log('Single line version:');
            console.log(JSON.stringify(json));
        } catch (err) {
            console.error('❌ Error saving workspace:', err);
        }
    };

    return (
        <Box mb={4}>
            <VStack align="stretch" gap={2}>
                {/* Save Button */}
                <Box>
                    <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={handleSaveWorkspace}
                        disabled={isLoading || !!error}
                    >
                        💾 Save Workspace to Console
                    </Button>
                </Box>

                {/* Error Message */}
                {error && (
                    <Box
                        p={3}
                        bg="red.50"
                        border="1px solid"
                        borderColor="red.200"
                        borderRadius="md"
                    >
                        <Text color="red.700" fontSize="sm">
                            ❌ Error: {error}
                        </Text>
                    </Box>
                )}

                {/* Blockly Workspace */}
                <Box
                    border="1px solid"
                    borderColor="gray.300"
                    borderRadius="md"
                    overflow="hidden"
                    position="relative"
                >
                    {isLoading && (
                        <Box
                            position="absolute"
                            top="50%"
                            left="50%"
                            transform="translate(-50%, -50%)"
                            zIndex={10}
                        >
                            <VStack>
                                <Spinner size="xl" color="blue.500" />
                                <Text fontSize="sm" color="gray.600">
                                    Loading Blockly workspace...
                                </Text>
                            </VStack>
                        </Box>
                    )}
                    <div
                        ref={blocklyDiv}
                        style={{
                            height: `${height}px`,
                            width: '100%',
                            opacity: isLoading ? 0.3 : 1
                        }}
                    />
                </Box>
            </VStack>
        </Box>
    );
};

