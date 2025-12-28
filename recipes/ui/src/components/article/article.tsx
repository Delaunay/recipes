
import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
} from '@chakra-ui/react';


import { BlockBase, newBlock, ArticleDef, BlockDef, PendingAction } from './base'
import type {
    ActionDeleteBlock,
    ActionUpdateBlock,
    ActionReorderBlock,
    ActionInsertBlock,
    ActionBatch,
    ArticleBlock
} from './base'
import { recipeAPI } from '../../services/api'

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


function loadUncomittedChange(): ActionBatch {
    //return new Array<BlockUpdate>()
    let actions = JSON.parse(localStorage.getItem('articleBlockActions') || '[]');
    return { "actions": actions }
}

function savePendingChange(batch: ActionBatch) {
    //return new Array<BlockUpdate>()
    localStorage.setItem('articleBlockActions', JSON.stringify(batch["actions"]));
}





export class ArticleInstance implements ArticleBlock {
    // TODO: amek this a BlockBase too
    //
    // Change are appended to a changelist array
    // The change are saved to the browser cache
    // The changes are pushed to the server
    // browser cache is cleared on success
    //
    // We can reapply changelist in case of error or disconnect
    kind = "article"
    def: ArticleDef;
    children: Array<BlockBase>;
    listeners = new Set<() => void>();
    pendingChange: PendingAction[] = []
    article: ArticleInstance
    saveTimeoutRef: NodeJS.Timeout | null = null

    // For connection loss and change batching
    // pendingChange: ActionBatch = loadUncomittedChange()

    // For undo support
    changeHistory: ActionBatch = { "actions": [] }

    notify() {
        for (const l of this.listeners) l();
    }
    constructor(article: ArticleDef) {
        this.def = article
        this.children = this.def.blocks.map(child => newBlock(this, child, this))
        this.article = this

        // Extra block used for direct insertion
        //  This COULD be not correct because this block does not exist on the DB
        //  but as soon as something is written to it it should be inserted
        this.children.push(newBlock(this, { kind: "text", data: { text: "" } }, this))

        // if pendingChange exist reapply them
    }

    public pushAction(pendingAction: PendingAction) {
        // The action is executed right away in the view
        pendingAction.doAction();

        // but batched for the server
        this.pendingChange.push(pendingAction)

        // Schedule auto-save after 2 seconds of inactivity
        this.scheduleAutoSave();
    }

    private scheduleAutoSave() {
        // Clear existing timeout
        if (this.saveTimeoutRef) {
            clearTimeout(this.saveTimeoutRef);
        }

        // Set new timeout to save after 2 seconds
        this.saveTimeoutRef = setTimeout(() => {
            this.persistServerChange().catch(error => {
                console.error('Auto-save failed:', error);
            });
            this.saveTimeoutRef = null;
        }, 2000);
    }

    public deleteBlock(blockTarget: BlockBase) {
        const index = this.children.indexOf(blockTarget);

        // How to execute the action on the current view
        const doAction = () => {

            if (index === -1) {
                console.warn("Block not found, cannot delete:", blockTarget);
                return;
            }
            this.children.splice(index, 1);
            this.notify()
        }

        // How to revert the action on the current view
        const undoAction = () => {
            // this.insertBlock(index, [blockTarget])
        }

        // How to make the server persist the action to the database
        const remoteAction: ActionDeleteBlock = {
            op: "delete",
            index: index,
            block_id: blockTarget.def.id
        }

        this.pendingChange.push({
            action: remoteAction,
            doAction: doAction,
            undoAction: undoAction
        })
    }

    updateBlock(blockTarget: BlockBase, newData: BlockDef) {
        const oldDef = blockTarget.def
        const newDef = {
            ...blockTarget.def,
            ...newData
        }

        // How to execute the action on the current view
        const doAction = () => {
            blockTarget.def = newDef
        }

        // How to revert the action on the current view
        const undoAction = () => {
            blockTarget.def = oldDef
        }

        // How to make the server persist the action to the database
        const remoteAction: ActionUpdateBlock = {
            op: "update",
            block_id: blockTarget.def.id,
            block_def: newData,
        }

        this.pushAction({
            action: remoteAction,
            doAction: doAction,
            undoAction: undoAction
        })
    }

    reorderBlock(block: BlockBase, prev: BlockBase, next: BlockBase) {
        const previous = block.def.sequence
        const newsequence = (prev.def.sequence + next.def.sequence) / 2

        const previousParent = block.getParent()
        const previousIndex = previousParent.children.indexOf(block)

        // insert block between prev and next
        const doAction = () => {
            block.def.sequence = newsequence

            // Remove the item we want to move from its parent
            const item = previousParent.children.splice(previousIndex, 1)[0];

            // Insert the item we want to its new parent
            const newParent = prev.getParent()
            const ToIndex = newParent.children.indexOf(prev)
            newParent.children.splice(ToIndex + 1, 0, item);
        }

        // How to revert the action on the current view
        const undoAction = () => {
            // Remove the item from the new parent
            const newParent = prev.getParent()
            const fromIndex = newParent.children.indexOf(block)
            const item = newParent.children.splice(fromIndex, 1)[0];

            // Insert it pack to its old parent
            previousParent.children.splice(previousIndex, 0, item)
            block.def.sequence = previous
        }

        // How to make the server persist the action to the database
        const remoteAction: ActionReorderBlock = {
            op: "reorder",
            block_id: block.def.id,
            sequence: newsequence,
        }

        this.pushAction({
            action: remoteAction,
            doAction: doAction,
            undoAction: undoAction
        })
    }

    insertBlock(parent: ArticleBlock, target: BlockBase | number, newChildren: BlockDef[]) {
        const insertIndex = typeof target === "number" ?
            target : parent.children.indexOf(target);

        // How to execute the action on the current view
        const doAction = () => {
            if (insertIndex === -1) {
                throw new Error(`Target block not found in ${self}`);
            }

            const newBlocks = newChildren.map(def => newBlock(this, def, parent));

            parent.children.splice(insertIndex + 1, 0, ...newBlocks);

            parent.notify()
        }

        // How to revert the action on the current view
        const undoAction = () => {
            if (insertIndex === -1) {
                return;
            }
            parent.children.splice(
                insertIndex + 1,
                newChildren.length
            );
        }

        // How to make the server persist the action to the database
        const remoteAction: ActionInsertBlock = {
            op: "insert",
            parent: parent.def.id,
            children: newChildren
        }

        this.pushAction({
            action: remoteAction,
            doAction: doAction,
            undoAction: undoAction
        })
    }

    getParent(): ArticleBlock {
        return this;
    }

    getChildren(): ArticleBlock[] {
        return this.children
    }

    saveUncomittedChange() {
        // savePendingChange(this.pendingChange)
    }

    async persistServerChange() {
        if (this.pendingChange.length === 0) {
            return;
        }

        try {
            // Extract actions from pending changes
            const actions = this.pendingChange.map(pending => pending.action);

            // Make request to the server
            await recipeAPI.updateBlocksBatch(actions);

            // On success, clear the pending changes
            const changes = this.pendingChange.map(p => p.action);
            this.changeHistory["actions"].push(...changes);
            this.pendingChange = [];
            this.saveUncomittedChange();
        } catch (error) {
            console.error('Failed to persist changes:', error);
            // On error, keep pending changes for retry
            throw error;
        }
    }

    public fetchReferenceByID(blockID: string | number): BlockBase {
        for (const block of this.children) {
            if (block.def.id === blockID) {
                return block;
            }
        }
        throw new Error(`Block with id ${blockID} not found`);
    }

    react() {
        return ArticleView({ article: this })
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
        return () => {
            article.listeners.delete(rerender);
            // Cleanup auto-save timeout on unmount
            if (article.saveTimeoutRef) {
                clearTimeout(article.saveTimeoutRef);
                article.saveTimeoutRef = null;
            }
        };
    }, [article]);

    console.log("RENDERING", article.children.length);

    return (
        <Box flex="1">
            {article.def.title}
            {article.children.map(child => child.react())}
            { }
        </Box>
    );
};

