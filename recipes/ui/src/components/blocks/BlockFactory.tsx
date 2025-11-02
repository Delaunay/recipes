import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import { BlockComponentProps, BlockEditorProps } from './BlockTypes';
import { HeadingBlock } from './HeadingBlock';
import { ParagraphBlock } from './ParagraphBlock';
import { TextBlock } from './TextBlock';
import { ImageBlock } from './ImageBlock';
import { CodeBlock } from './CodeBlock';
import { VideoBlock } from './VideoBlock';
import { AudioBlock } from './AudioBlock';
import { ListBlock } from './ListBlock';
import { LayoutBlock } from './LayoutBlock';
import { LatexBlock } from './LatexBlock';
import { MermaidBlock } from './MermaidBlock';
import { ReferenceBlock } from './ReferenceBlock';
import { FootnoteBlock } from './FootnoteBlock';
import { TableOfContentsBlock } from './TableOfContentsBlock';
import { SpreadsheetBlock } from './SpreadsheetBlock';
import { VegaPlotBlock } from './VegaPlotBlock';

// Import editors
import { HeadingBlockEditor } from './HeadingBlockEditor';
import { ParagraphBlockEditor } from './ParagraphBlockEditor';
import { TextBlockEditor } from './TextBlockEditor';
import { ImageBlockEditor } from './ImageBlockEditor';
import { CodeBlockEditor } from './CodeBlockEditor';
import { MediaBlockEditor } from './MediaBlockEditor';
import { ListBlockEditor } from './ListBlockEditor';
import { LayoutBlockEditor } from './LayoutBlockEditor';
import { LatexBlockEditor } from './LatexBlockEditor';
import { MermaidBlockEditor } from './MermaidBlockEditor';
import { ReferenceBlockEditor } from './ReferenceBlockEditor';
import { FootnoteBlockEditor } from './FootnoteBlockEditor';
import { TableOfContentsBlockEditor } from './TableOfContentsBlockEditor';
import { SpreadsheetBlockEditor } from './SpreadsheetBlockEditor';
import { VegaPlotBlockEditor } from './VegaPlotBlockEditor';

/**
 * Block factory that maps block kinds to their corresponding components and editors
 */
class BlockFactoryClass {
    private blockMap: Map<string, React.FC<BlockComponentProps>>;
    private editorMap: Map<string, React.FC<BlockEditorProps>>;

    constructor() {
        this.blockMap = new Map();
        this.editorMap = new Map();
        this.registerDefaultBlocks();
    }

    /**
     * Register all default block types
     */
    private registerDefaultBlocks() {
        this.register('heading', HeadingBlock, HeadingBlockEditor);
        this.register('paragraph', ParagraphBlock, ParagraphBlockEditor);
        this.register('text', TextBlock, TextBlockEditor);
        this.register('image', ImageBlock, ImageBlockEditor);
        this.register('code', CodeBlock, CodeBlockEditor);
        this.register('video', VideoBlock, MediaBlockEditor);
        this.register('audio', AudioBlock, MediaBlockEditor);
        this.register('list', ListBlock, ListBlockEditor);
        this.register('layout', LayoutBlock, LayoutBlockEditor);
        this.register('latex', LatexBlock, LatexBlockEditor);
        this.register('mermaid', MermaidBlock, MermaidBlockEditor);
        this.register('reference', ReferenceBlock, ReferenceBlockEditor);
        this.register('footnote', FootnoteBlock, FootnoteBlockEditor);
        this.register('toc', TableOfContentsBlock, TableOfContentsBlockEditor);
        this.register('spreadsheet', SpreadsheetBlock, SpreadsheetBlockEditor);
        this.register('plot', VegaPlotBlock, VegaPlotBlockEditor);
    }

    /**
     * Register a new block type with its component and optional editor
     */
    public register(
        kind: string,
        component: React.FC<BlockComponentProps>,
        editor?: React.FC<BlockEditorProps>
    ) {
        this.blockMap.set(kind, component);
        if (editor) {
            this.editorMap.set(kind, editor);
        }
    }

    /**
     * Get the component for a given block kind
     */
    public getComponent(kind: string): React.FC<BlockComponentProps> | undefined {
        return this.blockMap.get(kind);
    }

    /**
     * Get the editor component for a given block kind
     */
    public getEditor(kind: string): React.FC<BlockEditorProps> | undefined {
        return this.editorMap.get(kind);
    }

    /**
     * Check if a block kind is registered
     */
    public hasComponent(kind: string): boolean {
        return this.blockMap.has(kind);
    }

    /**
     * Check if a block kind has an editor
     */
    public hasEditor(kind: string): boolean {
        return this.editorMap.has(kind);
    }

    /**
     * Render a block using the factory
     */
    public render(props: BlockComponentProps): React.ReactElement {
        const { block } = props;
        const kind = block.kind || 'text';

        const Component = this.getComponent(kind);

        if (Component) {
            return <Component {...props} />;
        }

        // Fallback for unknown block types
        return (
            <Box mb={4} p={4} bg="yellow.50" borderRadius="md" borderLeft="4px solid" borderColor="yellow.400">
                <Text fontSize="sm" fontWeight="bold" color="yellow.800" mb={2}>
                    Unknown Block Type: {kind}
                </Text>
                <Text fontSize="xs" color="gray.600">
                    Block data: {JSON.stringify(block.data, null, 2)}
                </Text>
            </Box>
        );
    }

    /**
     * Render an editor for a block using the factory
     */
    public renderEditor(props: BlockEditorProps): React.ReactElement {
        const { block } = props;
        const kind = block.kind || 'text';

        const EditorComponent = this.getEditor(kind);

        if (EditorComponent) {
            return <EditorComponent {...props} />;
        }

        // Fallback for blocks without editors
        return (
            <Text fontSize="sm" color="gray.500">
                No editor available for this block type
            </Text>
        );
    }

    /**
     * Get all registered block kinds
     */
    public getRegisteredKinds(): string[] {
        return Array.from(this.blockMap.keys());
    }
}

// Export a singleton instance
export const BlockFactory = new BlockFactoryClass();

// Export React component wrappers for convenience
export const BlockRenderer: React.FC<BlockComponentProps> = (props) => {
    return BlockFactory.render(props);
};

export const BlockEditorRenderer: React.FC<BlockEditorProps> = (props) => {
    return BlockFactory.renderEditor(props);
};

