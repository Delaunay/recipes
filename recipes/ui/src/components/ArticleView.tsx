import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Text, Spinner, VStack } from '@chakra-ui/react';
import { recipeAPI } from '../services/api';
import { Article as ArticleType, ArticleBlock } from '../services/type';
import Article from './article/article';
import { ArticleDef, BlockDef } from './article/base';

const ArticleView: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [article, setArticle] = useState<ArticleDef | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const articleId = searchParams.get('id');

        if (!articleId) {
            setError('No article ID provided');
            setLoading(false);
            return;
        }

        const fetchArticle = async () => {
            try {
                setLoading(true);
                setError(null);

                const articleIdNum = parseInt(articleId, 10);
                if (isNaN(articleIdNum)) {
                    throw new Error('Invalid article ID');
                }

                const fetchedArticle = await recipeAPI.getArticle(articleIdNum);

                // Convert Article to ArticleDef format
                const articleDef: ArticleDef = {
                    id: fetchedArticle.id || 0,
                    root_id: fetchedArticle.root_id || fetchedArticle.id || 0,
                    parent_id: fetchedArticle.parent_id,
                    title: fetchedArticle.title || 'Untitled',
                    namespace: fetchedArticle.namespace || '',
                    tags: fetchedArticle.tags || {},
                    extension: fetchedArticle.extension || {},
                    blocks: convertBlocks(fetchedArticle.blocks || [])
                };

                setArticle(articleDef);
            } catch (err) {
                console.error('Failed to fetch article:', err);
                setError(err instanceof Error ? err.message : 'Failed to load article');
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [searchParams]);

    // Convert ArticleBlock[] to BlockDef[]
    const convertBlocks = (blocks: ArticleBlock[]): BlockDef[] => {
        return blocks.map((block, i) => ({
            id: block.id || 0,
            page_id: block.page_id || 0,
            parent_id: block.parent_id,
            sequence: block.sequence || i,
            kind: block.kind || 'text',
            data: block.data || {},
            extension: block.extension || {},
            children: block.children ? convertBlocks(block.children) : []
        }));
    };

    if (loading) {
        return (
            <VStack spacing={4} align="center" justify="center" minH="400px">
                <Spinner size="xl" color="orange.500" />
                <Text color="fg.muted">Loading article...</Text>
            </VStack>
        );
    }

    if (error) {
        return (
            <Box p={6} bg="bg.error.subtle" borderRadius="md" border="1px solid" borderColor="border.error">
                <Text color="fg.error" fontSize="lg" fontWeight="600" mb={2}>
                    Error loading article
                </Text>
                <Text color="fg.error">{error}</Text>
            </Box>
        );
    }

    if (!article) {
        return (
            <Box p={6}>
                <Text color="fg.muted">Article not found</Text>
            </Box>
        );
    }

    return <Article article={article} />;
};

export default ArticleView;


