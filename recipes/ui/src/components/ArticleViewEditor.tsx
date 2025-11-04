import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    VStack,
    Heading,
    Text,
    HStack,
    Badge,
    Container,
    Button,
    IconButton,
    Portal,
    Input,
    Textarea
} from '@chakra-ui/react';
import { Article, ArticleBlock, ArticleBlockKind } from '../services/type';
import mockArticles from '../mock/ArticleMockData';
import { BlockRenderer, BlockEditorRenderer, setBlockViewEditor } from './blocks';

// Icons
const GearIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z" />
    </svg>
);

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2H9v6a1 1 0 1 1-2 0V9H1a1 1 0 0 1 0-2h6V1a1 1 0 0 1 1-1z" />
    </svg>
);

const DeleteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
    </svg>
);

const MoveUpIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M8 3.5a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z" />
        <path fillRule="evenodd" d="M7.646 2.646a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8 3.707 5.354 6.354a.5.5 0 1 1-.708-.708l3-3z" />
    </svg>
);

const MoveDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M8 12.5a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-1 0v9a.5.5 0 0 0 .5.5z" />
        <path fillRule="evenodd" d="M7.646 13.354a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8 12.293l-2.646-2.647a.5.5 0 0 0-.708.708l3 3z" />
    </svg>
);

const SaveIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v7.293l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L7.5 9.293V2a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1H2z" />
    </svg>
);

const DragIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2.5 4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0 4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" />
    </svg>
);

// Block type definitions
const BLOCK_TYPES: { value: ArticleBlockKind; label: string; icon: string }[] = [
    { value: 'heading', label: 'Heading', icon: 'H' },
    { value: 'paragraph', label: 'Paragraph', icon: '¶' },
    { value: 'text', label: 'Text', icon: 'T' },
    { value: 'code', label: 'Code', icon: '</>' },
    { value: 'image', label: 'Image', icon: '🖼️' },
    { value: 'video', label: 'Video', icon: '🎥' },
    { value: 'audio', label: 'Audio', icon: '🔊' },
    { value: 'list', label: 'List', icon: '•' },
    { value: 'layout', label: 'Layout', icon: '⚏' },
    { value: 'latex', label: 'LaTeX', icon: 'Σ' },
    { value: 'mermaid', label: 'Diagram', icon: '📊' },
    { value: 'reference', label: 'Reference', icon: '📚' },
    { value: 'toc', label: 'Table of Contents', icon: '📑' },
    { value: 'spreadsheet', label: 'Spreadsheet', icon: '📊' },
    { value: 'plot', label: 'Vega Plot', icon: '📈' },
    { value: 'accordion', label: 'Accordion', icon: '▶' },
    { value: 'alert', label: 'Alert', icon: '⚠️' },
    { value: 'bibliography', label: 'Bibliography', icon: '📚' },
    { value: 'footnotes', label: 'Footnotes', icon: '📝' },
    { value: 'table', label: 'Table', icon: '🗂️' },
    { value: 'timeline', label: 'Timeline', icon: '📅' },
    { value: 'definition', label: 'Definition', icon: '📖' },
    { value: 'glossary', label: 'Glossary', icon: '📚' },
    { value: 'theorem', label: 'Theorem', icon: '∀' },
    { value: 'citation', label: 'Citation', icon: '❝' },
    { value: 'button', label: 'Button', icon: '🔘' },
    { value: 'toggle', label: 'Toggle', icon: '▼' },
    { value: 'diff', label: 'Diff', icon: '±' },
    { value: 'embed', label: 'Embed', icon: '🎬' },
    { value: 'gallery', label: 'Gallery', icon: '🖼️' },
    { value: 'quiz', label: 'Quiz', icon: '❓' },
    { value: 'form', label: 'Form', icon: '📝' },
    { value: 'cli', label: 'CLI Command', icon: '⌨️' },
    { value: 'filetree', label: 'File Tree', icon: '📁' },
    { value: 'iframe', label: 'Iframe', icon: '🪟' },
    { value: 'slideshow', label: 'Slideshow', icon: '🎞️' },
    { value: 'animation', label: 'Animation', icon: '🎬' },
    { value: 'datastructure', label: 'Data Structure', icon: '🔷' },
    { value: 'sandbox', label: 'Live Code', icon: '⚡' },
    { value: 'model3d', label: '3D Model', icon: '🎨' },
    { value: 'trace', label: 'Execution Trace', icon: '🔍' },
    { value: 'workflow', label: 'Workflow', icon: '🔄' },
    { value: 'constraint', label: 'Constraints', icon: '⚖️' },
    { value: 'ast', label: 'AST', icon: '🌳' },
    { value: 'bnf', label: 'BNF Grammar', icon: '📜' },
    { value: 'graph', label: 'Node Graph', icon: '🕸️' },
    { value: 'blockly', label: 'Blockly', icon: '🧩' },
];

interface BlockSettingsModalProps {
    block: ArticleBlock;
    onUpdate: (block: ArticleBlock) => void;
    onClose: () => void;
    onDelete: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    position: { top: number; left: number };
}

const BlockSettingsModal: React.FC<BlockSettingsModalProps> = ({
    block,
    onUpdate,
    onClose,
    onDelete,
    onMoveUp,
    onMoveDown,
    position
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [editedBlock, setEditedBlock] = useState<ArticleBlock>({ ...block });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Smart data preservation when changing block type
    const convertBlockData = (fromKind: ArticleBlockKind, toKind: ArticleBlockKind, oldData: any): any => {
        // If same type, keep all data
        if (fromKind === toKind) return oldData;

        const newData: any = {};

        // Extract text content from old data
        const extractText = (data: any): string => {
            return data?.text || data?.content || data?.code || data?.citation || data?.formula || data?.diagram || '';
        };

        const oldText = extractText(oldData);

        // Preserve common fields
        switch (toKind) {
            case 'heading':
                newData.level = oldData?.level || 2;
                newData.text = oldText || 'New Heading';
                break;

            case 'paragraph':
            case 'text':
                newData.text = oldText || 'New paragraph';
                break;

            case 'code':
                newData.language = oldData?.language || 'javascript';
                newData.code = oldData?.code || oldText || '// code here';
                break;

            case 'image':
                newData.url = oldData?.url || '';
                newData.alt = oldData?.alt || '';
                newData.caption = oldData?.caption || '';
                break;

            case 'video':
            case 'audio':
                newData.url = oldData?.url || '';
                newData.caption = oldData?.caption || '';
                break;

            case 'list':
                // Try to preserve existing items or convert text to items
                if (oldData?.items) {
                    newData.items = oldData.items;
                } else if (oldText) {
                    newData.items = oldText.split('\n').filter((line: string) => line.trim());
                } else {
                    newData.items = [''];
                }
                newData.ordered = oldData?.ordered !== undefined ? oldData.ordered : false;
                break;

            case 'layout':
                newData.columns = oldData?.columns || 2;
                break;

            case 'latex':
                newData.formula = oldData?.formula || oldText || 'E = mc^2';
                break;

            case 'mermaid':
                newData.diagram = oldData?.diagram || oldText || 'graph TD\n  A --> B';
                break;

            case 'reference':
                newData.citation = oldData?.citation || oldText || 'Author, Year. Title.';
                break;

            case 'footnote':
                newData.number = oldData?.number || '1';
                newData.text = oldText || 'Footnote text';
                break;

            default:
                // For unknown types, preserve everything
                return oldData;
        }

        return newData;
    };

    const updateBlockKind = (kind: ArticleBlockKind) => {
        setEditedBlock(prev => {
            const convertedData = convertBlockData(prev.kind as ArticleBlockKind, kind, prev.data);
            return { ...prev, kind, data: convertedData };
        });
    };

    const updateBlockData = (key: string, value: any) => {
        setEditedBlock(prev => ({
            ...prev,
            data: {
                ...prev.data,
                [key]: value
            }
        }));
    };

    const handleSave = () => {
        // Create a deep clone to ensure React detects the change
        const updatedBlock: ArticleBlock = {
            ...editedBlock,
            data: { ...editedBlock.data },
            children: editedBlock.children ? [...editedBlock.children] : undefined
        };
        onUpdate(updatedBlock);
        onClose();
    };

    // Block data editor is now handled by BlockEditorRenderer component


    return (
        <Portal>
            <Box
                ref={modalRef}
                position="fixed"
                top={`${Math.min(position.top, window.innerHeight - 500)}px`}
                left={`${Math.min(position.left, window.innerWidth - 420)}px`}
                bg="white"
                boxShadow="2xl"
                borderRadius="lg"
                p={4}
                zIndex={1000}
                width="400px"
                maxH="80vh"
                overflowY="auto"
                border="1px solid"
                borderColor="gray.300"
            >
                <VStack gap={3} align="stretch">
                    {/* Header */}
                    <HStack justify="space-between" pb={2} borderBottom="1px solid" borderColor="gray.200">
                        <Text fontSize="md" fontWeight="bold">
                            Block Settings
                        </Text>
                        <Badge colorScheme="purple" fontSize="xs">
                            ID: {editedBlock.id}
                        </Badge>
                    </HStack>

                    {/* Block Type Selector */}
                    <Box>
                        <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={2}>
                            BLOCK TYPE
                        </Text>
                        <Box
                            maxH="150px"
                            overflowY="auto"
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="md"
                            p={1}
                        >
                            {BLOCK_TYPES.map(type => (
                                <Button
                                    key={type.value}
                                    size="sm"
                                    variant={editedBlock.kind === type.value ? 'solid' : 'ghost'}
                                    colorScheme={editedBlock.kind === type.value ? 'blue' : 'gray'}
                                    width="100%"
                                    justifyContent="flex-start"
                                    onClick={() => updateBlockKind(type.value)}
                                    mb={1}
                                >
                                    <Text mr={2}>{type.icon}</Text>
                                    {type.label}
                                </Button>
                            ))}
                        </Box>
                    </Box>

                    {/* Block Data Editor */}
                    <Box>
                        <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={2}>
                            CONTENT
                        </Text>
                        <Box
                            p={3}
                            bg="gray.50"
                            borderRadius="md"
                            border="1px solid"
                            borderColor="gray.200"
                        >
                            <BlockEditorRenderer
                                block={editedBlock}
                                onChange={updateBlockData}
                            />
                        </Box>
                    </Box>

                    {/* Actions */}
                    <Box>
                        <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={2}>
                            ACTIONS
                        </Text>
                        <HStack gap={2} flexWrap="wrap">
                            {onMoveUp && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        onMoveUp();
                                        onClose();
                                    }}
                                >
                                    <MoveUpIcon /> Move Up
                                </Button>
                            )}
                            {onMoveDown && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        onMoveDown();
                                        onClose();
                                    }}
                                >
                                    <MoveDownIcon /> Move Down
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant="outline"
                                colorScheme="red"
                                onClick={() => {
                                    if (confirm('Delete this block and all its children?')) {
                                        onDelete();
                                        onClose();
                                    }
                                }}
                            >
                                <DeleteIcon /> Delete
                            </Button>
                        </HStack>
                    </Box>

                    {/* Save/Cancel Buttons */}
                    <HStack gap={2} pt={2} borderTop="1px solid" borderColor="gray.200">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onClose}
                            flex={1}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={handleSave}
                            flex={1}
                        >
                            <SaveIcon /> Save Changes
                        </Button>
                    </HStack>
                </VStack>
            </Box>
        </Portal>
    );
};

interface AddBlockMenuProps {
    onSelect: (blockType: ArticleBlockKind) => void;
    onClose: () => void;
    position: { top: number; left: number };
}

const AddBlockMenu: React.FC<AddBlockMenuProps> = ({ onSelect, onClose, position }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <Portal>
            <Box
                ref={menuRef}
                position="fixed"
                top={`${position.top}px`}
                left={`${position.left}px`}
                bg="white"
                boxShadow="lg"
                borderRadius="md"
                p={2}
                zIndex={1000}
                minW="200px"
                maxH="300px"
                overflowY="auto"
                border="1px solid"
                borderColor="gray.200"
            >
                <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={2} px={2}>
                    ADD BLOCK
                </Text>
                {BLOCK_TYPES.map(type => (
                    <Button
                        key={type.value}
                        size="sm"
                        variant="ghost"
                        width="100%"
                        justifyContent="flex-start"
                        onClick={() => {
                            onSelect(type.value);
                            onClose();
                        }}
                        mb={1}
                    >
                        <Text mr={2}>{type.icon}</Text>
                        {type.label}
                    </Button>
                ))}
            </Box>
        </Portal>
    );
};

interface BlockViewEditorProps {
    block: ArticleBlock;
    readonly: boolean;
    onUpdate?: (block: ArticleBlock) => void;
    onDelete?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onAddChild?: (blockType: ArticleBlockKind) => void;
    level?: number;
    onHoverChange?: (blockId: number | undefined, isHovering: boolean) => void;
    hoveredBlockId?: number | undefined;
    onDragStart?: (blockId: number | undefined) => void;
    onDragEnd?: () => void;
    onDrop?: (targetBlockId: number | undefined, position: 'before' | 'after') => void;
    draggedBlockId?: number | undefined;
    article?: Article; // For TOC and other auto-generated blocks
}

const BlockViewEditor: React.FC<BlockViewEditorProps> = ({
    block,
    readonly,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
    onAddChild,
    level = 0,
    onHoverChange,
    hoveredBlockId,
    onDragStart,
    onDragEnd,
    onDrop,
    draggedBlockId,
    article
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [settingsPosition, setSettingsPosition] = useState({ top: 0, left: 0 });
    const [addMenuPosition, setAddMenuPosition] = useState({ top: 0, left: 0 });
    const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null);
    const blockRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Only this specific block is hovered (not children)
    const isDirectlyHovered = hoveredBlockId === block.id;
    const isDragging = draggedBlockId === block.id;
    const isDragTarget = dropPosition !== null && !isDragging && draggedBlockId !== undefined;

    const handleGearClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setSettingsPosition({
            top: rect.bottom + 5,
            left: rect.left
        });
        setShowSettings(true);
    };

    const handlePlusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setAddMenuPosition({
            top: rect.bottom + 5,
            left: rect.left
        });
        setShowAddMenu(true);
    };

    const renderBlock = () => {
        // For generator blocks (TOC, Bibliography, Footnotes, Glossary), inject all blocks from the article into their data
        const isGeneratorBlock = ['toc', 'bibliography', 'footnotes', 'glossary'].includes(block.kind || '');
        const blockToRender = isGeneratorBlock
            ? {
                ...block,
                data: {
                    ...block.data,
                    allBlocks: article?.blocks || []
                }
            }
            : block;

        // Use the BlockFactory to render the block
        return (
            <BlockRenderer
                block={blockToRender}
                readonly={readonly}
                onUpdate={onUpdate}
                level={level}
                onHoverChange={onHoverChange}
                hoveredBlockId={hoveredBlockId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDrop={onDrop}
                draggedBlockId={draggedBlockId}
            />
        );
    };



    const handleMouseEnter = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent parent blocks from also getting hover
        if (!readonly && onHoverChange) {
            onHoverChange(block.id, true);
        }
    };

    const handleMouseLeave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!readonly && onHoverChange) {
            onHoverChange(block.id, false);
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        if (onDragStart) {
            onDragStart(block.id);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', block.id?.toString() || '');
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.stopPropagation();
        setDropPosition(null);
        if (onDragEnd) {
            onDragEnd();
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isDragging || !blockRef.current) return;

        const rect = blockRef.current.getBoundingClientRect();
        const midPoint = rect.top + rect.height / 2;
        const newPosition = e.clientY < midPoint ? 'before' : 'after';

        if (newPosition !== dropPosition) {
            setDropPosition(newPosition);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.stopPropagation();
        // Clear drop position when leaving the block
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const isOutside = e.clientX < rect.left || e.clientX > rect.right ||
            e.clientY < rect.top || e.clientY > rect.bottom;
        if (isOutside) {
            setDropPosition(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isDragging || !dropPosition) return;

        if (onDrop) {
            onDrop(block.id, dropPosition);
        }

        setDropPosition(null);
    };

    return (
        <Box position="relative">
            {/* Drop indicator - before */}
            {isDragTarget && dropPosition === 'before' && (
                <Box
                    position="absolute"
                    top={-2}
                    left={0}
                    right={0}
                    height="4px"
                    bg="blue.400"
                    borderRadius="full"
                    zIndex={20}
                    boxShadow="0 0 8px rgba(66, 153, 225, 0.6)"
                />
            )}

            <Box
                ref={blockRef}
                data-block-id={block.id}
                position="relative"
                borderRadius="md"
                transition="all 0.2s"
                bg={!readonly && isDirectlyHovered ? 'blue.50' : 'transparent'}
                p={!readonly && isDirectlyHovered ? 2 : 0}
                opacity={isDragging ? 0.4 : 1}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                draggable={!readonly}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                cursor={!readonly ? 'grab' : 'default'}
                _active={!readonly ? { cursor: 'grabbing' } : {}}
            >
                {/* Hover Controls - Only show on directly hovered block */}
                {!readonly && isDirectlyHovered && !isDragging && (
                    <>
                        {/* Drag Handle (top left) */}
                        <Box
                            position="absolute"
                            top={1}
                            left={1}
                            p={1}
                            bg="gray.600"
                            color="white"
                            borderRadius="md"
                            cursor="grab"
                            _active={{ cursor: 'grabbing' }}
                            boxShadow="md"
                            zIndex={10}
                        >
                            <DragIcon />
                        </Box>

                        {/* Gear Icon (top right) */}
                        <IconButton
                            aria-label="Block settings"
                            size="xs"
                            position="absolute"
                            top={1}
                            right={1}
                            colorScheme="blue"
                            variant="solid"
                            onClick={handleGearClick}
                            zIndex={10}
                            boxShadow="md"
                        >
                            <GearIcon />
                        </IconButton>

                        {/* Plus Icon (bottom right) */}
                        {onAddChild && (
                            <IconButton
                                aria-label="Add child block"
                                size="xs"
                                position="absolute"
                                bottom={1}
                                right={1}
                                colorScheme="green"
                                variant="solid"
                                onClick={handlePlusClick}
                                zIndex={10}
                                boxShadow="md"
                            >
                                <PlusIcon />
                            </IconButton>
                        )}
                    </>
                )}

                {/* Block Content */}
                <Box ref={contentRef}>
                    {renderBlock()}
                </Box>

                {/* Children (for non-layout blocks) */}
                {block.kind !== 'layout' && block.children && block.children.length > 0 && (
                    <Box ml={level > 0 ? 4 : 0}>
                        {block.children.map((child, index) => (
                            <BlockViewEditor
                                key={child.id}
                                block={child}
                                readonly={readonly}
                                onUpdate={onUpdate ? (updatedChild) => {
                                    if (block.children) {
                                        const newChildren = [...block.children];
                                        newChildren[index] = updatedChild;
                                        onUpdate({ ...block, children: newChildren });
                                    }
                                } : undefined}
                                onDelete={onDelete ? () => {
                                    if (block.children && onUpdate) {
                                        const newChildren = block.children.filter((_, i) => i !== index);
                                        onUpdate({ ...block, children: newChildren });
                                    }
                                } : undefined}
                                onMoveUp={index > 0 && onUpdate ? () => {
                                    if (block.children) {
                                        const newChildren = [...block.children];
                                        [newChildren[index - 1], newChildren[index]] = [newChildren[index], newChildren[index - 1]];
                                        onUpdate({ ...block, children: newChildren });
                                    }
                                } : undefined}
                                onMoveDown={index < (block.children?.length || 0) - 1 && onUpdate ? () => {
                                    if (block.children) {
                                        const newChildren = [...block.children];
                                        [newChildren[index], newChildren[index + 1]] = [newChildren[index + 1], newChildren[index]];
                                        onUpdate({ ...block, children: newChildren });
                                    }
                                } : undefined}
                                onAddChild={onAddChild ? (blockType) => {
                                    const newBlock: ArticleBlock = {
                                        id: Date.now() + Math.random(),
                                        parent_id: child.id,
                                        kind: blockType,
                                        data: {},
                                        children: []
                                    };
                                    const updatedChild = { ...child, children: [...(child.children || []), newBlock] };
                                    if (block.children && onUpdate) {
                                        const newChildren = [...block.children];
                                        newChildren[index] = updatedChild;
                                        onUpdate({ ...block, children: newChildren });
                                    }
                                } : undefined}
                                level={level + 1}
                                onHoverChange={onHoverChange}
                                hoveredBlockId={hoveredBlockId}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                                onDrop={onDrop}
                                draggedBlockId={draggedBlockId}
                                article={article}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            {/* Drop indicator - after */}
            {isDragTarget && dropPosition === 'after' && (
                <Box
                    position="absolute"
                    bottom={-2}
                    left={0}
                    right={0}
                    height="4px"
                    bg="blue.400"
                    borderRadius="full"
                    zIndex={20}
                    boxShadow="0 0 8px rgba(66, 153, 225, 0.6)"
                />
            )}

            {/* Settings Modal */}
            {showSettings && onUpdate && (
                <BlockSettingsModal
                    block={block}
                    onUpdate={onUpdate}
                    onClose={() => setShowSettings(false)}
                    onDelete={onDelete!}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    position={settingsPosition}
                />
            )}

            {/* Add Block Menu */}
            {showAddMenu && onAddChild && (
                <AddBlockMenu
                    onSelect={(blockType) => {
                        onAddChild(blockType);
                    }}
                    onClose={() => setShowAddMenu(false)}
                    position={addMenuPosition}
                />
            )}
        </Box>
    );
};

// Main Component
const ArticleViewEditor: React.FC = () => {
    const [readonly, setReadonly] = useState(true);
    const [article, setArticle] = useState<Article | null>(null);
    const [showAddRootMenu, setShowAddRootMenu] = useState(false);
    const [addMenuPosition, setAddMenuPosition] = useState({ top: 0, left: 0 });
    const [hoveredBlockId, setHoveredBlockId] = useState<number | undefined>(undefined);
    const [draggedBlockId, setDraggedBlockId] = useState<number | undefined>(undefined);

    const handleBlockHoverChange = (blockId: number | undefined, isHovering: boolean) => {
        if (isHovering) {
            setHoveredBlockId(blockId);
        } else {
            // Only clear if this block was the one hovered
            setHoveredBlockId(prev => prev === blockId ? undefined : prev);
        }
    };

    // Find a block by ID in the tree
    const findBlockById = (blocks: ArticleBlock[], targetId: number | undefined): ArticleBlock | null => {
        if (!targetId) return null;

        for (const block of blocks) {
            if (block.id === targetId) return block;
            if (block.children) {
                const found = findBlockById(block.children, targetId);
                if (found) return found;
            }
        }
        return null;
    };

    // Remove a block from anywhere in the tree
    const removeBlockById = (blocks: ArticleBlock[], targetId: number | undefined): ArticleBlock[] => {
        if (!targetId) return blocks;

        return blocks
            .filter(block => block.id !== targetId)
            .map(block => ({
                ...block,
                children: block.children ? removeBlockById(block.children, targetId) : undefined
            }));
    };

    // Insert a block at a specific position
    const insertBlockAt = (blocks: ArticleBlock[], targetId: number | undefined, position: 'before' | 'after', blockToInsert: ArticleBlock): ArticleBlock[] => {
        if (!targetId) return blocks;

        const result: ArticleBlock[] = [];

        for (const block of blocks) {
            if (block.id === targetId) {
                if (position === 'before') {
                    result.push(blockToInsert);
                    result.push(block);
                } else {
                    result.push(block);
                    result.push(blockToInsert);
                }
            } else {
                result.push({
                    ...block,
                    children: block.children ? insertBlockAt(block.children, targetId, position, blockToInsert) : undefined
                });
            }
        }

        return result;
    };

    const handleDragStart = (blockId: number | undefined) => {
        setDraggedBlockId(blockId);
    };

    const handleDragEnd = () => {
        setDraggedBlockId(undefined);
    };

    const handleDrop = (targetBlockId: number | undefined, position: 'before' | 'after') => {
        if (!draggedBlockId || !targetBlockId || draggedBlockId === targetBlockId) {
            setDraggedBlockId(undefined); // Clear even on invalid drops
            return;
        }

        const blocks = displayArticle.blocks || [];

        // Find the dragged block
        const draggedBlock = findBlockById(blocks, draggedBlockId);
        if (!draggedBlock) {
            setDraggedBlockId(undefined);
            return;
        }

        // Remove the dragged block from its current position
        let newBlocks = removeBlockById(blocks, draggedBlockId);

        // Insert it at the new position
        newBlocks = insertBlockAt(newBlocks, targetBlockId, position, draggedBlock);

        updateArticle({ blocks: newBlocks });

        // Clear the dragged block ID after successful drop
        setDraggedBlockId(undefined);
    };

    // Get the initial article
    const getInitialArticle = (): Article => {
        return JSON.parse(JSON.stringify(mockArticles.comprehensive));
    };

    // Initialize article on mount
    React.useEffect(() => {
        setArticle(getInitialArticle());
    }, []);

    const displayArticle = article || getInitialArticle();

    const updateArticle = (updates: Partial<Article>) => {
        setArticle({ ...displayArticle, ...updates });
    };

    const addRootBlock = (blockType: ArticleBlockKind) => {
        const newBlock: ArticleBlock = {
            id: Date.now() + Math.random(),
            page_id: displayArticle.id,
            kind: blockType,
            data: {},
            children: []
        };
        updateArticle({ blocks: [...(displayArticle.blocks || []), newBlock] });
    };

    const handleSave = () => {
        console.log('Saving article:', displayArticle);
        alert('Article saved! (Check console for JSON)');
    };

    const handleExport = () => {
        const json = JSON.stringify(displayArticle, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `article-${displayArticle.id}.json`;
        a.click();
    };

    const handleAddRootClick = (e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setAddMenuPosition({
            top: rect.bottom + 5,
            left: rect.left
        });
        setShowAddRootMenu(true);
    };

    return (
        <Container maxW="container.lg" py={8}>
            {/* Top Toolbar */}
            <Box mb={6} p={4} bg="white" borderRadius="md" boxShadow="sm" position="sticky" top={0} zIndex={100}>
                <HStack gap={4} justify="space-between" flexWrap="wrap">
                    <HStack gap={2}>
                        <Button
                            size="sm"
                            colorScheme={readonly ? "gray" : "green"}
                            variant={readonly ? "outline" : "solid"}
                            onClick={() => setReadonly(!readonly)}
                        >
                            {readonly ? '🔒 Read-Only' : '✏️ Editing'}
                        </Button>

                        {!readonly && (
                            <>
                                <Button
                                    size="sm"
                                    colorScheme="blue"
                                    onClick={handleSave}
                                >
                                    <SaveIcon /> Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleExport}
                                >
                                    Export JSON
                                </Button>
                            </>
                        )}
                    </HStack>
                </HStack>
            </Box>

            {/* Article Header */}
            <Box mb={8} p={readonly ? 0 : 4} bg={readonly ? 'transparent' : 'gray.50'} borderRadius="md">
                {/* Tags */}
                <Box mb={4}>
                    {readonly ? (
                        <HStack gap={2} flexWrap="wrap">
                            {displayArticle.tags?.map((tag: string, index: number) => (
                                <Badge key={index} colorScheme="blue">
                                    {tag}
                                </Badge>
                            ))}
                        </HStack>
                    ) : (
                        <VStack align="stretch" gap={2}>
                            <Text fontSize="xs" fontWeight="bold" color="gray.600">
                                TAGS
                            </Text>
                            <HStack gap={2} flexWrap="wrap">
                                {displayArticle.tags?.map((tag: string, index: number) => (
                                    <Badge
                                        key={index}
                                        colorScheme="blue"
                                        display="flex"
                                        alignItems="center"
                                        gap={1}
                                        pr={1}
                                    >
                                        {tag}
                                        <Box
                                            as="span"
                                            cursor="pointer"
                                            onClick={() => {
                                                const newTags = displayArticle.tags?.filter((_: string, i: number) => i !== index);
                                                updateArticle({ tags: newTags });
                                            }}
                                            ml={1}
                                            fontWeight="bold"
                                            _hover={{ color: 'red.500' }}
                                        >
                                            ×
                                        </Box>
                                    </Badge>
                                ))}
                                <Input
                                    placeholder="Add tag..."
                                    size="xs"
                                    width="150px"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const value = e.currentTarget.value.trim();
                                            if (value) {
                                                const newTags = [...(displayArticle.tags || []), value];
                                                updateArticle({ tags: newTags });
                                                e.currentTarget.value = '';
                                            }
                                        }
                                    }}
                                />
                            </HStack>
                        </VStack>
                    )}
                </Box>

                {/* Title */}
                {readonly ? (
                    <Heading as="h1" fontSize="2xl" mb={4}>
                        {displayArticle.title}
                    </Heading>
                ) : (
                    <VStack align="stretch" gap={1} mb={4}>
                        <Text fontSize="xs" fontWeight="bold" color="gray.600">
                            TITLE
                        </Text>
                        <Input
                            value={displayArticle.title}
                            onChange={(e) => updateArticle({ title: e.target.value })}
                            fontSize="2xl"
                            fontWeight="bold"
                            size="lg"
                            bg="white"
                        />
                    </VStack>
                )}

                {/* Namespace */}
                {readonly ? (
                    displayArticle.namespace && (
                        <Text color="gray.500" fontSize="sm" mb={2}>
                            Namespace: {displayArticle.namespace}
                        </Text>
                    )
                ) : (
                    <VStack align="stretch" gap={1} mb={4}>
                        <Text fontSize="xs" fontWeight="bold" color="gray.600">
                            NAMESPACE
                        </Text>
                        <Input
                            value={displayArticle.namespace || ''}
                            onChange={(e) => updateArticle({ namespace: e.target.value })}
                            placeholder="e.g., tutorials/web-dev"
                            size="sm"
                            bg="white"
                        />
                    </VStack>
                )}

                {/* Extension (metadata) */}
                {!readonly && (
                    <VStack align="stretch" gap={1} mb={4}>
                        <Text fontSize="xs" fontWeight="bold" color="gray.600">
                            METADATA (JSON)
                        </Text>
                        <Textarea
                            value={JSON.stringify(displayArticle.extension || {}, null, 2)}
                            onChange={(e) => {
                                try {
                                    const parsed = JSON.parse(e.target.value);
                                    updateArticle({ extension: parsed });
                                } catch (error) {
                                    // Invalid JSON, don't update
                                }
                            }}
                            placeholder='{"author": "Your Name", "publishedDate": "2025-11-02"}'
                            size="sm"
                            fontFamily="monospace"
                            fontSize="xs"
                            minHeight="80px"
                            bg="white"
                        />
                        <Text fontSize="xs" color="gray.500">
                            Additional metadata like author, date, custom fields (must be valid JSON)
                        </Text>
                    </VStack>
                )}

                {/* Extension display in readonly mode */}
                {readonly && displayArticle.extension && (
                    <Box mb={2}>
                        <HStack gap={4} fontSize="sm" color="gray.600" flexWrap="wrap">
                            {Object.entries(displayArticle.extension).map(([key, value]) => (
                                <Text key={key}>
                                    <Text as="span" fontWeight="medium">{key}:</Text> {String(value)}
                                </Text>
                            ))}
                        </HStack>
                    </Box>
                )}

                <Box mt={6} borderBottom="1px solid" borderColor="gray.200" />
            </Box>

            {/* Article Content */}
            <VStack gap={0} align="stretch">
                {displayArticle.blocks?.map((block, index) => (
                    <BlockViewEditor
                        key={block.id}
                        block={block}
                        readonly={readonly}
                        onUpdate={!readonly ? (updatedBlock) => {
                            const newBlocks = [...(displayArticle.blocks || [])];
                            newBlocks[index] = updatedBlock;
                            updateArticle({ blocks: newBlocks });
                        } : undefined}
                        onDelete={!readonly ? () => {
                            const newBlocks = (displayArticle.blocks || []).filter((_, i) => i !== index);
                            updateArticle({ blocks: newBlocks });
                        } : undefined}
                        onMoveUp={!readonly && index > 0 ? () => {
                            const newBlocks = [...(displayArticle.blocks || [])];
                            [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
                            updateArticle({ blocks: newBlocks });
                        } : undefined}
                        onMoveDown={!readonly && index < (displayArticle.blocks?.length || 0) - 1 ? () => {
                            const newBlocks = [...(displayArticle.blocks || [])];
                            [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
                            updateArticle({ blocks: newBlocks });
                        } : undefined}
                        onAddChild={!readonly ? (blockType) => {
                            const newBlock: ArticleBlock = {
                                id: Date.now() + Math.random(),
                                parent_id: block.id,
                                kind: blockType,
                                data: {},
                                children: []
                            };
                            const updatedBlock = {
                                ...block,
                                children: [...(block.children || []), newBlock]
                            };
                            const newBlocks = [...(displayArticle.blocks || [])];
                            newBlocks[index] = updatedBlock;
                            updateArticle({ blocks: newBlocks });
                        } : undefined}
                        onHoverChange={handleBlockHoverChange}
                        hoveredBlockId={hoveredBlockId}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop}
                        draggedBlockId={draggedBlockId}
                        article={displayArticle}
                    />
                ))}
            </VStack>

            {/* Add Root Block */}
            {!readonly && (
                <Box mt={8} textAlign="center">
                    <Button
                        colorScheme="green"
                        variant="outline"
                        onClick={handleAddRootClick}
                    >
                        <PlusIcon /> Add Block
                    </Button>

                    {showAddRootMenu && (
                        <AddBlockMenu
                            onSelect={(blockType) => {
                                addRootBlock(blockType);
                            }}
                            onClose={() => setShowAddRootMenu(false)}
                            position={addMenuPosition}
                        />
                    )}
                </Box>
            )}

            {/* Help Text */}
            {!readonly && (
                <Box mt={8} p={4} bg="blue.50" borderRadius="md">
                    <Text fontSize="sm" fontWeight="bold" mb={2}>💡 Editing Tips:</Text>
                    <VStack gap={1} align="flex-start" fontSize="sm">
                        <Text>• Text blocks are directly editable - just click and type</Text>
                        <Text>• Hover over blocks to see controls (drag, settings, add child)</Text>
                        <Text>• Drag blocks by the ≡ icon to reorder them</Text>
                        <Text>• Use the ⚙️ gear icon to change block type and edit properties</Text>
                        <Text>• Use the + icon to add nested child blocks</Text>
                        <Text>• Press Enter in a heading to save changes</Text>
                    </VStack>
                </Box>
            )}
        </Container>
    );
};

// Set up BlockViewEditor for LayoutBlock to use (resolves circular dependency)
setBlockViewEditor(BlockViewEditor);

export default ArticleViewEditor;
