
import React, { useState, useRef, useEffect, useCallback,  } from 'react';
import {
    Box,
} from '@chakra-ui/react';


import { BlockBase, newBlock, ArticleDef, BlockDef } from './base'


import "./blocks/heading"
import "./blocks/paragraph"
import "./blocks/text"
import "./blocks/list"
import "./blocks/item"
import "./blocks/layout"
import "./blocks/toc"
import "./blocks/code"
import "./blocks/image"
import "./blocks/video"
import "./blocks/audio"
import "./blocks/latex"
import "./blocks/mermaid"
import "./blocks/reference"
import "./blocks/footnote"
import "./blocks/bibliography"
import "./blocks/footnotes"
import "./blocks/spreadsheet"
import "./blocks/plot"
import "./blocks/table"
import "./blocks/timeline"
import "./blocks/accordion"
import "./blocks/alert"
import "./blocks/quiz"
import "./blocks/toggle"
import "./blocks/button"
import "./blocks/embed"
import "./blocks/form"
import "./blocks/gallery"
import "./blocks/slideshow"
import "./blocks/animation"
import "./blocks/iframe"
import "./blocks/model3d"
import "./blocks/diff"
import "./blocks/cli"
import "./blocks/sandbox"
import "./blocks/definition"
import "./blocks/glossary"
import "./blocks/theorem"
import "./blocks/citation"
import "./blocks/graph"
import "./blocks/blockly"
import "./blocks/electrical"
import "./blocks/drawing"
import "./blocks/workflow"
import "./blocks/constraint"
import "./blocks/filetree"
import "./blocks/datastructure"
import "./blocks/trace"
import "./blocks/ast"
import "./blocks/bnf"


export interface BlockUpdate {
    action: string;             // UPDATE, DELETE, INSERT
    block_id: string | number;  // Block to update (for delete)
    block: BlockDef;            // Block data for update and insert
}

function loadUncomittedChange(): Array<BlockUpdate> {
    return new Array<BlockUpdate>()
}


export class ArticleInstance {
    // Change are appended to a changelist array
    // The change are saved to the browser cache
    // The changes are pushed to the server
    // browser cache is cleared on success
    //
    // We can reapply changelist in case of error or disconnect

    def: ArticleDef;
    blocks: Array<BlockBase>;
    listeners = new Set<() => void>();
    changeList: Array<BlockUpdate> = loadUncomittedChange()

    notify() {
        for (const l of this.listeners) l();
    }
    constructor(article: ArticleDef) {
        this.def = article
        this.blocks = this.def.blocks.map(child => newBlock(this, child, this))
    }

    getParent() {
        return this;
    }

    saveUncomittedChange() {
        //  save change to the browser cache
    }

    persistServerChange() {
        // push changeList to the server

        // Clear ChangeList
        this.changeList = new Array<BlockUpdate>()
        this.saveUncomittedChange()
    }

    public fetchReferenceByID(blockID: string|number): BlockBase {
        for (const block of this.blocks) {
            if (block.def.id === blockID) {
                return block;
            }
        }
        throw new Error(`Block with id ${blockID} not found`);
    }

    // HOw do I do the drag and drop?
    public reorder(blockTarget: BlockBase) {

    }

    public deleteBlock(blockTarget: BlockBase) {
        const index = this.blocks.indexOf(blockTarget);
        if (index === -1) {
            console.warn("Block not found, cannot delete:", blockTarget);
            return;
        }
        this.blocks.splice(index, 1);
        this.notify()
    }

    public insertBlocksAfterBlock(blockTarget: BlockBase, blocksToInsert: Array<BlockDef>) {
        const index = this.blocks.indexOf(blockTarget);
        if (index === -1) {
            throw new Error("Target block not found in ArticleInstance");
        }
        const newBlocks = blocksToInsert.map(def => newBlock(this, def, this));
        this.blocks.splice(index + 1, 0, ...newBlocks);
        this.notify()
    }

    react() {
        return ArticleView({article: this})
    }
}


interface ArticleProps {
    article: ArticleDef
}


const Article: React.FC<ArticleProps> = ({ article }) => {
    const instanceRef = useRef<ArticleInstance | null>(null);

    if (!instanceRef.current) {
        instanceRef.current = new ArticleInstance(article);
    }

    return <ArticleView article={instanceRef.current} />;
}

export default Article;


const ArticleView: React.FC<{ article: ArticleInstance }> = ({ article }) => {
    const [, setTick] = useState(0);

    useEffect(() => {
        const rerender = () => setTick(t => t + 1);
        article.listeners.add(rerender);
        return () => article.listeners.delete(rerender);
    }, [article]);

    console.log("RENDERING", article.blocks.length);

    return (
        <Box flex="1">
            {article.def.title}
            {article.blocks.map(child => child.react())}
        </Box>
    );
};

