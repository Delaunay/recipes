
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
    ArticleBlock,
    ActionInsertBlockReply
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
import { math } from 'blockly/blocks';


function loadUncomittedChange(): ActionBatch {
    //return new Array<BlockUpdate>()
    let actions = JSON.parse(localStorage.getItem('articleBlockActions') || '[]');
    return { "actions": actions }
}

function savePendingChange(batch: ActionBatch) {
    //return new Array<BlockUpdate>()
    localStorage.setItem('articleBlockActions', JSON.stringify(batch["actions"]));
}

function _reconcileChildrenInsert(article: ArticleInstance, action: ActionInsertBlock, result: ActionInsertBlockReply, blocks: ArticleBlock[], depth: number = 0) {
    const nChildrenAction = action["children"].length
    const nChildrenResult = result["children"].length
    const nChilrenBlock   = blocks.length

    console.log(nChildrenAction, nChildrenResult, nChilrenBlock)

    if (nChildrenAction !== nChildrenResult && nChildrenAction !== nChilrenBlock) {
        console.log("ERROR MISSING CHILDREN", nChildrenAction, nChildrenResult, nChilrenBlock)
    }

    const count = Math.min(nChildrenAction, nChildrenResult, nChilrenBlock)

    for(let j = 0; j < count; j++) {
        let actionChild = action["children"][j]
        let updateChild = result["children"][j]
        let block      = blocks[j]

        // Set the database id here
        block.def.id = updateChild["id"]

        if (actionChild.children?.length) {
            _reconcileChildrenInsert(article, actionChild, updateChild, block.children, depth + 1)
        }
    }
}

function blockUpdateReconciliation(article: ArticleInstance, queuedActions: PendingAction[], updateResult: []) {
    const nUpdate = queuedActions.length
    const nResults = updateResult.length

    if (nUpdate !== nResults) {
        console.log("ERROR MISSING RESULTS", nUpdate, nResults)
    }

    const count = Math.min(nUpdate, nResults)
    
    for(let i = 0; i < count; i++) {
        let action = queuedActions[i].action
        let result = updateResult[i]

        console.log("--- RECONCILE")
        console.log(action)
        console.log(result)
        console.log(queuedActions[i].blocks)

        if (action["op"] !== result["action"]) {
            console.log("ERROR: Action mismatch")
            continue
        }

        if (action["op"] === "insert") {
            _reconcileChildrenInsert(article, action, result, queuedActions[i].blocks)
        }

        if (action["op"] === "reorder") {

        }

        if (action["op"] === "update") {

        }

        if (action["op"] === "delete") {

        }
    }
}


function blockDefinitionMerger(article: ArticleInstance, original: BlockBase, newer: BlockDef, depth: number = 0) {
    const keys = new Set([
        ...Object.keys(original.def),
        ...Object.keys(newer)
    ]);

    const skipKeys = new Set([
        "id", "page_id", "parent", "children", "parent_id"
    ])

    let wasModified = false;

    for (const key of keys) {
        if (skipKeys.has(key))
            continue;

        const oValue = original.def[key];
        const nValue = newer[key];

        // New field
        if (oValue === undefined) {
            original.def[key] = nValue;
            wasModified = true;
            console.log("Setting", key, "to", nValue)
        }
        // Updated fields
        else if (oValue !== nValue) {
            original.def[key] = nValue;
            wasModified = true;
            console.log("Setting", key, "to", nValue)
        }
        // Deleted fields
        else if (nValue === undefined) {
            original.def[key] = undefined;
            wasModified = true;
            console.log("Setting", key, "to", nValue)
        }
    }

    const oChildrenCount = original.children?.length ?? 0;
    const nChildrenCount = newer.children?.length ?? 0;

    // Original has children
    if (oChildrenCount > 0) {
        // UPDATE: BOTH HAVE children
        if (nChildrenCount > 0) {
            const sharedCount = Math.min(oChildrenCount, nChildrenCount)

            // Merged shared children
            for (let i = 0; i < sharedCount; i++) {
                blockDefinitionMerger(article, original.children[i], newer.children[i], depth + 1)
            }

            // INSERT MISSING children
            if (nChildrenCount >= oChildrenCount) {
                article.insertBlock(original, sharedCount, newer.children.slice(sharedCount))
            }

            // DELETE extra children
            if (oChildrenCount >= nChildrenCount) {
                for (let i = sharedCount; i < original.children.length; i++) {
                    article.deleteBlock(original.children[i])
                }
            }

        }
        // DELETE all original children
        else {
            for (let i = 0; i < oChildrenCount; i++) {
                article.deleteBlock(original.children[i])
            }
        }
    }
    // INSERT: Original DOes NOT have children but the node has children
    else if (nChildrenCount > 0) {
        article.insertBlock(original, 1, newer.children)
    }

    if (wasModified) {
        article._updateBlock(original, original.def)
    }
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
        console.log("DOING", pendingAction)
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

        this.pushAction({
            action: remoteAction,
            doAction: doAction,
            undoAction: undoAction
        })
    }

    _updateBlock(blockTarget: BlockBase, newData: BlockDef) {
        let oldDef = blockTarget.def

        // How to execute the action on the current view
        const doAction = () => {
            blockTarget.children = blockTarget.def.children ? blockTarget.def.children?.map(
                child => newBlock(blockTarget.article, child, blockTarget)) : [];
        }

        // How to revert the action on the current view
        const undoAction = () => {
            blockTarget.def = oldDef
            blockTarget.children = blockTarget.def.children ? blockTarget.def.children?.map(
                child => newBlock(blockTarget.article, child, blockTarget)) : [];
        }

        // How to make the server persist the action to the database
        const remoteAction: ActionUpdateBlock = {
            op: "update",
            id: blockTarget.def.id,
            block_def: newData,
        }

        this.pushAction({
            action: remoteAction,
            doAction: doAction,
            undoAction: undoAction
        })
    }


    updateBlock(blockTarget: BlockBase, newData: BlockDef) {
        // HERE we need to match current definition and the new definition
        // to output either update block action or insert block
        blockDefinitionMerger(this.article, blockTarget, newData)
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

        const oldDef = parent.def
        let futureAction: PendingAction = {
            action: undefined,
            doAction: undefined,
            undoAction: undefined,
            blocks: []
        }

        // How to execute the action on the current view
        const doAction = () => {
            if (insertIndex === -1) {
                throw new Error(`Target block not found in ${self}`);
            }

            if (parent.def["children"]) {
                parent.def["children"].splice(insertIndex + 1, 0, ...newChildren)
            } else {
                parent.def["children"] = newChildren
                
            }
            
            parent.children = parent.def["children"].map(child => newBlock(this, child, parent))
            
            // Fetch the inserted blocks so we can populate the ID frm the database
            // const startCount = insertIndex + 1
            futureAction.blocks = parent.children.slice(-newChildren.length)
            // console.log(futureAction.blocks)
            // console.log(startCount, startCount + newChildren.length)
            // console.log(parent.children.length)
            parent.notify()
        }

        // How to revert the action on the current view
        const undoAction = () => {
            if (insertIndex === -1) {
                return;
            }
            parent.def = oldDef
            parent.children.splice(
                insertIndex + 1,
                newChildren.length
            );
            parent.notify()
        }

        function getParentId() {
            // If parent is an ArticleInstance, return null
            if (parent instanceof ArticleInstance) {
                return null
            }

            // Otherwise return its id
            return parent?.def?.id ?? null
        }

        // How to make the server persist the action to the database
        const remoteAction: ActionInsertBlock = {
            op: "insert",
            page_id: this.def.id,
            parent: getParentId(),
            children: newChildren
        }

        futureAction.action = remoteAction
        futureAction.doAction = doAction
        futureAction.undoAction = undoAction

        this.pushAction(futureAction)
    }

    getParentId() {
        return null;
    }
    getParent(): null | ArticleBlock {
        return null;
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
            const queuedChange = this.pendingChange

            const actions = queuedChange.map(pending => pending.action);

            // Make request to the server
            const updateResult = await recipeAPI.updateBlocksBatch(actions);
            
            blockUpdateReconciliation(this, queuedChange, updateResult)
        
            // On success, clear the pending changes
            // this.changeHistory["actions"].push(...this.pendingChange);
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


function renderSortedBySequence(items: BlockBase[]): any {
    return items
        //   .sort((a, b) => {
        //     const seqA = a.getSequence();
        //     const seqB = b.getSequence();

        //     // Compare numbers if both are numbers
        //     if (typeof seqA === 'number' && typeof seqB === 'number') {
        //       return seqA - seqB;
        //     }

        //     // Otherwise, compare as strings
        //     return String(seqA).localeCompare(String(seqB));
        //   })
        .map(item => item.react());
}


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
            {renderSortedBySequence(article.children)}
        </Box>
    );
};

