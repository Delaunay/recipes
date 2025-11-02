import { Article } from '../services/type';

/**
 * Comprehensive mock article demonstrating ALL block types
 * This single article showcases every available block type for easy testing
 */
export const comprehensiveArticle: Article = {
    id: 1,
    title: 'Complete Article Block Showcase',
    namespace: 'documentation/blocks',
    tags: ['demo', 'all-blocks', 'comprehensive'],
    extension: {
        author: 'System',
        publishedDate: '2025-11-02',
        readTime: '10 min'
    },
    blocks: [
        // Heading Level 1
        {
            id: 1,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 1,
                text: 'Article Block System Documentation'
            }
        },
        // Paragraph
        {
            id: 2,
            page_id: 1,
            kind: 'paragraph',
            data: {
                text: 'This article demonstrates all available block types in the article system. Each block can be edited, reordered via drag-and-drop, and nested within other blocks. The system is designed to be modular and extensible.'
            }
        },
        // Heading Level 2
        {
            id: 3,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 2,
                text: 'Text and Content Blocks'
            }
        },
        // Simple text block
        {
            id: 4,
            page_id: 1,
            kind: 'text',
            data: {
                content: 'This is a simple text block. It\'s lighter weight than a paragraph and great for short snippets.'
            }
        },
        // Unordered List
        {
            id: 5,
            page_id: 1,
            kind: 'list',
            data: {
                ordered: false,
                items: [
                    'Text blocks for simple content',
                    'Paragraph blocks for longer text',
                    'Heading blocks with 6 levels',
                    'Code blocks with syntax highlighting'
                ]
            }
        },
        // Heading Level 2
        {
            id: 6,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 2,
                text: 'Code and Technical Content'
            }
        },
        // Code block
        {
            id: 7,
            page_id: 1,
            kind: 'code',
            data: {
                language: 'typescript',
                code: `// Example TypeScript code
interface ArticleBlock {
    id?: number;
    kind?: string;
    data?: any;
    children?: ArticleBlock[];
}

function renderBlock(block: ArticleBlock) {
    return BlockFactory.render({ block, readonly: false });
}`
            }
        },
        // Paragraph
        {
            id: 8,
            page_id: 1,
            kind: 'paragraph',
            data: {
                text: 'Code blocks support syntax highlighting for multiple languages including JavaScript, TypeScript, Python, and more.'
            }
        },
        // Heading Level 2
        {
            id: 9,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 2,
                text: 'Media Blocks'
            }
        },
        // Image
        {
            id: 10,
            page_id: 1,
            kind: 'image',
            data: {
                url: 'https://via.placeholder.com/800x400/4299e1/ffffff?text=Sample+Image',
                alt: 'Sample placeholder image',
                caption: 'This is an image block with a caption'
            }
        },
        // Video
        {
            id: 11,
            page_id: 1,
            kind: 'video',
            data: {
                url: 'https://www.w3schools.com/html/mov_bbb.mp4',
                caption: 'Video blocks support standard video formats'
            }
        },
        // Audio
        {
            id: 12,
            page_id: 1,
            kind: 'audio',
            data: {
                url: 'https://www.w3schools.com/html/horse.mp3',
                caption: 'Audio blocks for podcasts and sound files'
            }
        },
        // Heading Level 2
        {
            id: 13,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 2,
                text: 'Structured Content'
            }
        },
        // Ordered List
        {
            id: 14,
            page_id: 1,
            kind: 'list',
            data: {
                ordered: true,
                items: [
                    'First step: Plan your article structure',
                    'Second step: Add blocks for each content type',
                    'Third step: Edit inline or via settings modal',
                    'Fourth step: Drag to reorder blocks',
                    'Fifth step: Export or save your article'
                ]
            }
        },
        // Heading Level 2
        {
            id: 15,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 2,
                text: 'Multi-Column Layout'
            }
        },
        // Layout block with 3 columns
        {
            id: 16,
            page_id: 1,
            kind: 'layout',
            data: {
                columns: 3
            },
            children: [
                {
                    id: 17,
                    page_id: 1,
                    parent_id: 16,
                    kind: 'heading',
                    data: {
                        level: 3,
                        text: 'Column 1'
                    }
                },
                {
                    id: 18,
                    page_id: 1,
                    parent_id: 16,
                    kind: 'paragraph',
                    data: {
                        text: 'Layout blocks create responsive multi-column layouts. This is the first column.'
                    }
                },
                {
                    id: 19,
                    page_id: 1,
                    parent_id: 16,
                    kind: 'heading',
                    data: {
                        level: 3,
                        text: 'Column 2'
                    }
                },
                {
                    id: 20,
                    page_id: 1,
                    parent_id: 16,
                    kind: 'paragraph',
                    data: {
                        text: 'Each column can contain any block type. This is the second column.'
                    }
                },
                {
                    id: 21,
                    page_id: 1,
                    parent_id: 16,
                    kind: 'heading',
                    data: {
                        level: 3,
                        text: 'Column 3'
                    }
                },
                {
                    id: 22,
                    page_id: 1,
                    parent_id: 16,
                    kind: 'paragraph',
                    data: {
                        text: 'Columns stack responsively on mobile. This is the third column.'
                    }
                }
            ]
        },
        // Heading Level 2
        {
            id: 23,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 2,
                text: 'Mathematical and Diagram Content'
            }
        },
        // LaTeX
        {
            id: 24,
            page_id: 1,
            kind: 'latex',
            data: {
                formula: 'E = mc^2'
            }
        },
        {
            id: 25,
            page_id: 1,
            kind: 'paragraph',
            data: {
                text: 'LaTeX blocks are perfect for mathematical formulas and equations. Integration with KaTeX or MathJax would render these beautifully.'
            }
        },
        // Mermaid Diagram
        {
            id: 26,
            page_id: 1,
            kind: 'mermaid',
            data: {
                diagram: `graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]`
            }
        },
        {
            id: 27,
            page_id: 1,
            kind: 'paragraph',
            data: {
                text: 'Mermaid blocks allow you to create flowcharts, sequence diagrams, and other visualizations using simple text syntax.'
            }
        },
        // Heading Level 2
        {
            id: 28,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 2,
                text: 'References and Citations'
            }
        },
        // Reference
        {
            id: 29,
            page_id: 1,
            kind: 'reference',
            data: {
                citation: 'Smith, J. (2024). Modern Web Development Practices. Tech Publishers.'
            }
        },
        {
            id: 30,
            page_id: 1,
            kind: 'reference',
            data: {
                citation: 'Johnson, M. & Lee, K. (2023). Component-Based Architecture. Journal of Software Engineering, 45(2), 123-145.'
            }
        },
        // Paragraph with footnote reference
        {
            id: 31,
            page_id: 1,
            kind: 'paragraph',
            data: {
                text: 'The article system supports academic citations and footnotes[1] for scholarly content.'
            }
        },
        // Footnote
        {
            id: 32,
            page_id: 1,
            kind: 'footnote',
            data: {
                number: '1',
                text: 'Footnotes can provide additional context or references without cluttering the main text.'
            }
        },
        // Heading Level 2
        {
            id: 33,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 2,
                text: 'Nested Content Example'
            }
        },
        // Layout with nested content showing depth
        {
            id: 34,
            page_id: 1,
            kind: 'layout',
            data: {
                columns: 2
            },
            children: [
                {
                    id: 35,
                    page_id: 1,
                    parent_id: 34,
                    kind: 'heading',
                    data: {
                        level: 3,
                        text: 'Left Side'
                    }
                },
                {
                    id: 36,
                    page_id: 1,
                    parent_id: 34,
                    kind: 'paragraph',
                    data: {
                        text: 'Blocks can be nested multiple levels deep, creating complex document structures.'
                    }
                },
                {
                    id: 37,
                    page_id: 1,
                    parent_id: 34,
                    kind: 'list',
                    data: {
                        ordered: false,
                        items: [
                            'Nested layouts',
                            'Nested lists',
                            'Mixed content types',
                            'Responsive design'
                        ]
                    }
                },
                {
                    id: 38,
                    page_id: 1,
                    parent_id: 34,
                    kind: 'heading',
                    data: {
                        level: 3,
                        text: 'Right Side'
                    }
                },
                {
                    id: 39,
                    page_id: 1,
                    parent_id: 34,
                    kind: 'code',
                    data: {
                        language: 'javascript',
                        code: `// Nested block example
const article = {
  blocks: [
    {
      kind: 'layout',
      children: [
        { kind: 'heading' },
        { kind: 'paragraph' }
      ]
    }
  ]
};`
                    }
                }
            ]
        },
        // Conclusion
        {
            id: 40,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 2,
                text: 'Summary'
            }
        },
        {
            id: 41,
            page_id: 1,
            kind: 'paragraph',
            data: {
                text: 'This comprehensive example demonstrates all available block types in a single article. You can edit any block by clicking the gear icon, add nested content with the plus icon, and drag blocks to reorder them. Toggle readonly mode to switch between viewing and editing.'
            }
        },
        // Final list summarizing features
        {
            id: 42,
            page_id: 1,
            kind: 'heading',
            data: {
                level: 3,
                text: 'Key Features'
            }
        },
        {
            id: 43,
            page_id: 1,
            kind: 'list',
            data: {
                ordered: false,
                items: [
                    '14 different block types',
                    'Inline contenteditable for text blocks',
                    'Settings modal for advanced editing',
                    'Drag-and-drop reordering',
                    'Nested blocks and layouts',
                    'Responsive multi-column layouts',
                    'Type-safe TypeScript implementation',
                    'Modular and extensible architecture'
                ]
            }
        }
    ]
};

// Export as default
export const mockArticles = {
    comprehensive: comprehensiveArticle
};

export default mockArticles;
