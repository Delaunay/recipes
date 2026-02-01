
import React, { useState, useEffect } from 'react';

import { Box, Heading, VStack, HStack, Button, Text, Input, Icon, chakra } from '@chakra-ui/react';
import { FileText, Plus } from 'lucide-react';
import { Link as RouterLinkBase } from 'react-router-dom';
import { useColorModeValue } from '../ui/color-mode';
import { ArticleDef } from './base';
import { recipeAPI } from '../../services/api';

interface SubPageListProps {
    articleDef: ArticleDef;
}

const RouterLink = chakra(RouterLinkBase);

export const SubPageList: React.FC<SubPageListProps> = ({ articleDef }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [children, setChildren] = useState<any[]>(articleDef.children || []);
    const topLevelArticle = articleDef.top_level_article ?? { id: articleDef.root_id || articleDef.id, title: articleDef.title };

    const headingColor = useColorModeValue('gray.700', 'gray.200');
    const inputBg = useColorModeValue('white', 'gray.800');
    const inputBorder = useColorModeValue('gray.200', 'gray.600');
    const iconColor = useColorModeValue('gray.500', 'gray.400');
    const textColor = useColorModeValue('gray.700', 'gray.200');
    const emptyTextColor = useColorModeValue('gray.500', 'gray.400');
    const createBoxBg = useColorModeValue('gray.50', 'gray.700');

    useEffect(() => {
        setChildren(articleDef.children || []);
    }, [articleDef.children]);

    const handleCreate = async () => {
        if (!newTitle.trim()) return;

        try {
            const newArticle = await recipeAPI.createChildArticle(articleDef.id, {
                title: newTitle,
                root_id: articleDef.root_id || articleDef.id,
                namespace: articleDef.namespace,
                tags: [],
                extension: {}
            });

            setChildren([...children, newArticle]);
            setNewTitle("");
            setIsCreating(false);
        } catch (error) {
            console.error("Failed to create child article:", error);
        }
    };

    const renderTree = (nodes: any[]) => {
        if (!nodes || nodes.length === 0) return null;

        console.log(nodes)
        return (
            <Box as="ol" pl={4} style={{ listStylePosition: 'outside' }}>
                {nodes.map((node) => (
                    <Box as="li" key={node.id} mb={2}>
                        <HStack align="start">
                            <RouterLink
                                to={`/article?id=${node.id}`}
                                _hover={{ textDecoration: 'underline' }}
                                display="inline"
                                color={textColor}
                            >
                                {node.title}
                            </RouterLink>
                        </HStack>
                        {renderTree(node.children)}
                    </Box>
                ))}
            </Box>
        );
    };

    return (
        <Box>
            <HStack justifyContent="space-between" mb={4}>
                <Heading size="md" color={headingColor}>
                    <RouterLink
                        to={`/article?id=${topLevelArticle.id}`}
                        color={headingColor}
                        _hover={{ textDecoration: 'underline' }}
                    >
                        {topLevelArticle.title}
                    </RouterLink>
                </Heading>
                <Button size="xs" variant="ghost" onClick={() => setIsCreating(true)} disabled={isCreating}>
                    <Plus size={16} style={{ marginRight: '4px' }} /> Add Page
                </Button>
            </HStack>

            {isCreating && (
                <Box mb={4} p={3} bg={createBoxBg} borderRadius="md" border="1px solid" borderColor={inputBorder}>
                    <HStack>
                        <Input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Page title"
                            autoFocus
                            size="sm"
                            bg={inputBg}
                            borderColor={inputBorder}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreate();
                                if (e.key === 'Escape') setIsCreating(false);
                            }}
                        />
                        <Button onClick={handleCreate} colorScheme="blue" size="sm">Create</Button>
                        <Button onClick={() => setIsCreating(false)} variant="ghost" size="sm">Cancel</Button>
                    </HStack>
                </Box>
            )}

            <VStack align="stretch" gap={2}>
                {children.length === 0 && !isCreating && (
                    <Text color={emptyTextColor} fontSize="sm" fontStyle="italic">No sub-pages yet.</Text>
                )}
                {renderTree(children)}
            </VStack>
        </Box>
    );
};
