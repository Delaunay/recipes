import { FC, useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Heading, Text, VStack, Button, HStack } from '@chakra-ui/react';
import { recipeAPI } from '../services/api';
import { Article } from '../services/type';

const ContentView: FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const isStatic = recipeAPI.isStaticMode();

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                setLoading(true);
                const data = await recipeAPI.getArticles();
                setArticles(data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch articles:', err);
                setError('Failed to load articles');
            } finally {
                setLoading(false);
            }
        };

        fetchArticles();
    }, []);

    const handleCreateNewPage = async () => {
        if (isStatic) {
            alert('Creating pages is not available in static mode');
            return;
        }

        try {
            const newArticle = await recipeAPI.createArticle({
                title: 'Untitled Page',
                namespace: null,
                tags: [],
                extension: {},
                blocks: []
            });
            // Navigate to the article editor
            navigate(`/article?id=${newArticle.id}`);
        } catch (err) {
            console.error('Failed to create article:', err);
            alert('Failed to create new page');
        }
    };

    // Group articles by first letter
    const groupedArticles = useMemo(() => {
        const groups: { [key: string]: Article[] } = {};

        articles.forEach(article => {
            const firstLetter = (article.title?.[0] || '#').toUpperCase();
            if (!groups[firstLetter]) {
                groups[firstLetter] = [];
            }
            groups[firstLetter].push(article);
        });

        // Sort articles within each group
        Object.keys(groups).forEach(letter => {
            groups[letter].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        });

        return Object.keys(groups).sort().map(letter => ({
            letter,
            articles: groups[letter]
        }));
    }, [articles]);

    return (
        <Box>
            <HStack justify="space-between" align="center" mb={6}>
                <Heading size="2xl" color="#f56500">
                    Content
                </Heading>
                {!isStatic && (
                    <Button
                        colorScheme="orange"
                        size="lg"
                        onClick={handleCreateNewPage}
                    >
                        + Create New Page
                    </Button>
                )}
            </HStack>

            <Text fontSize="lg" color="gray.600" mb={8}>
                Browse and manage your articles and pages
            </Text>

            {loading && (
                <Text fontSize="md" color="gray.500">
                    Loading articles...
                </Text>
            )}

            {error && (
                <Box
                    p={4}
                    bg="red.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="red.200"
                >
                    <Text color="red.600">{error}</Text>
                </Box>
            )}

            {!loading && !error && (
                <Box
                    mb={6}
                    p={5}
                    bg="gray.50"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="gray.200"
                >
                    {articles.length === 0 ? (
                        <Box textAlign="center" py={8}>
                            <Text fontSize="md" color="gray.500" mb={4}>
                                No articles found
                            </Text>
                            {!isStatic && (
                                <Text fontSize="sm" color="gray.400">
                                    Click "Create New Page" to get started
                                </Text>
                            )}
                        </Box>
                    ) : (
                        <VStack align="stretch" gap={4}>
                            {groupedArticles.map((group) => (
                                <Box key={group.letter}>
                                    <Text
                                        fontSize="xl"
                                        fontWeight="700"
                                        color="orange.600"
                                        mb={3}
                                        pb={1}
                                        borderBottom="2px solid"
                                        borderColor="orange.200"
                                    >
                                        {group.letter}
                                    </Text>
                                    <VStack align="stretch" gap={3}>
                                        {group.articles.map((article) => (
                                            <Link
                                                key={article.id}
                                                to={`/article?id=${article.id}`}
                                                style={{ textDecoration: 'none' }}
                                            >
                                                <Box
                                                    pl={2}
                                                    py={2}
                                                    px={3}
                                                    borderRadius="md"
                                                    transition="all 0.2s"
                                                    _hover={{
                                                        bg: 'orange.50',
                                                        transform: 'translateX(4px)'
                                                    }}
                                                    cursor="pointer"
                                                >
                                                    <HStack justify="space-between" align="center">
                                                        <Box>
                                                            <Text fontSize="md" fontWeight="600" color="gray.800" mb={1}>
                                                                {article.title || 'Untitled'}
                                                            </Text>
                                                            {article.namespace && (
                                                                <Text fontSize="xs" color="gray.500">
                                                                    {article.namespace}
                                                                </Text>
                                                            )}
                                                            {article.tags && article.tags.length > 0 && (
                                                                <HStack gap={2} mt={1}>
                                                                    {article.tags.slice(0, 3).map((tag, idx) => (
                                                                        <Text
                                                                            key={idx}
                                                                            fontSize="xs"
                                                                            color="blue.700"
                                                                            fontWeight="600"
                                                                            px={2}
                                                                            py={0.5}
                                                                            bg="blue.100"
                                                                            borderRadius="sm"
                                                                        >
                                                                            {tag}
                                                                        </Text>
                                                                    ))}
                                                                    {article.tags.length > 3 && (
                                                                        <Text fontSize="xs" color="gray.500">
                                                                            +{article.tags.length - 3} more
                                                                        </Text>
                                                                    )}
                                                                </HStack>
                                                            )}
                                                        </Box>
                                                        <Text fontSize="sm" color="orange.600" fontWeight="600">
                                                            →
                                                        </Text>
                                                    </HStack>
                                                </Box>
                                            </Link>
                                        ))}
                                    </VStack>
                                </Box>
                            ))}
                        </VStack>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default ContentView;

