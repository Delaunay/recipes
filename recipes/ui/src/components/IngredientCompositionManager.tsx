import { useState, useEffect, FC } from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { recipeAPI, IngredientComposition } from '../services/api';
import NutritionFacts from './NutritionFacts';

interface IngredientCompositionManagerProps {
    ingredientId: number;
}

const IngredientCompositionManager: FC<IngredientCompositionManagerProps> = ({ ingredientId }) => {
    const [compositions, setCompositions] = useState<IngredientComposition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isStatic = recipeAPI.isStaticMode();

    useEffect(() => {
        loadCompositions();
    }, [ingredientId]);

    const loadCompositions = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await recipeAPI.getIngredientCompositions(ingredientId);

            // Define the priority order for kinds
            const kindOrder = ['calories', 'fat', 'carbohydrate', 'carbo', 'protein', 'cholesterol', 'mineral', 'vitamin'];

            const getKindPriority = (kind: string | undefined): number => {
                if (!kind) return 999; // Items without kind go last
                const lowerKind = kind.toLowerCase();

                // Find exact match or partial match
                for (let i = 0; i < kindOrder.length; i++) {
                    if (lowerKind.includes(kindOrder[i]) || kindOrder[i].includes(lowerKind)) {
                        return i;
                    }
                }
                // Unknown kinds go after known ones but before standalone items
                return 100;
            };

            // Sort: first by kind priority, then within each kind, items without name come first (totals)
            const sorted = data.sort((a, b) => {
                // First sort by kind priority
                const priorityA = getKindPriority(a.kind);
                const priorityB = getKindPriority(b.kind);

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                // Same kind priority, group by exact kind name
                const kindA = a.kind || '';
                const kindB = b.kind || '';
                if (kindA !== kindB) {
                    return kindA.localeCompare(kindB);
                }

                // Within same kind, items without name (totals) come first
                if (!a.name && b.name) return -1;
                if (a.name && !b.name) return 1;

                // Both have names or both don't, sort by name
                return (a.name || '').localeCompare(b.name || '');
            });

            setCompositions(sorted);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load compositions');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (data: Omit<IngredientComposition, 'id' | 'ingredient_id'>) => {
        await recipeAPI.createIngredientComposition(ingredientId, {
            name: data.name || '',
            kind: data.kind,
            quantity: data.quantity,
            unit: data.unit || '',
            daily_value: data.daily_value,
        });
    };

    const handleEdit = async (compositionId: number, data: Partial<IngredientComposition>) => {
        await recipeAPI.updateIngredientComposition(compositionId, data);
    };

    const handleDelete = async (compositionId: number) => {
        await recipeAPI.deleteIngredientComposition(compositionId);
    };

    if (loading) {
        return (
            <Box p={6} bg="orange.50" borderRadius="lg" borderLeft="4px solid" borderColor="orange.400">
                <Flex justify="center" align="center" minH="100px">
                    <Spinner size="lg" color="orange.500" />
                </Flex>
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={6} bg="red.50" borderRadius="lg" borderLeft="4px solid" borderColor="red.400">
                <Text fontWeight="medium" color="red.800" mb={1}>Error</Text>
                <Text fontSize="sm" color="red.700">{error}</Text>
            </Box>
        );
    }

    return (
        <NutritionFacts
            compositions={compositions}
            entityId={ingredientId}
            editable={!isStatic}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={loadCompositions}
        />
    );
};

export default IngredientCompositionManager;
