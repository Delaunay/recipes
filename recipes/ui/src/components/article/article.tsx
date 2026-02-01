
import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Heading,
    Input,
    Flex,
} from '@chakra-ui/react';


import { BlockBase, newBlock, ArticleDef, BlockDef, PendingAction } from './base'
import type {
    ActionDeleteBlock,
    ActionUpdateBlock,
    ActionReorderBlock,
    ActionInsertBlock,
    ActionBatch,
    ArticleBlock,
    ActionInsertBlockReply,
    ActionUpdateArticle
} from './base'
import { recipeAPI } from '../../services/api'
import { SubPageList } from './subpages'

import "./blocks/heading"
import "./blocks/paragraph"
import "./blocks/link"
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

function _reconcileChildrenInsert(article: ArticleInstance, action: ActionInsertBlock, result: ActionInsertBlockReply, blocks: ArticleBlock[], depth: number = 0) {
    const nChildrenAction = action["children"].length
    const nChildrenResult = result["children"].length
    const nChilrenBlock = blocks.length

    if (nChildrenAction !== nChildrenResult && nChildrenAction !== nChilrenBlock) {
        console.log("ERROR MISSING CHILDREN", nChildrenAction, nChildrenResult, nChilrenBlock)
    }

    const count = Math.min(nChildrenAction, nChildrenResult, nChilrenBlock)

    for (let j = 0; j < count; j++) {
        let actionChild = action["children"][j]
        let updateChild = result["children"][j]
        let block = blocks[j]

        // Set the database id here
        block.def.id = updateChild["id"]

        if (actionChild.children?.length) {
            _reconcileChildrenInsert(article, actionChild, updateChild, block.children, depth + 1)
        }
    }
}

function blockUpdateReconciliation(article: ArticleInstance, queuedActions: PendingAction[], updateResult: []) {
    //
    // Reconcile server action with displayed info
    // This is mostly here to set the block id after blocks were inserted
    //
    const nUpdate = queuedActions.length
    const nResults = updateResult.length

    if (nUpdate !== nResults) {
        console.log("ERROR MISSING RESULTS", nUpdate, nResults)
    }

    const count = Math.min(nUpdate, nResults)

    for (let i = 0; i < count; i++) {
        let action = queuedActions[i].action
        let result = updateResult[i]

        // console.log("--- RECONCILE")
        // console.log(action)
        // console.log(result)
        // console.log(queuedActions[i].blocks)

        if (action["op"] !== result["action"]) {
            console.log("ERROR: Action mismatch")
            continue
        }

        if (action["op"] === "insert") {
            _reconcileChildrenInsert(article, action, result, queuedActions[i].blocks)
        }

        if (action["op"] === "reorder") {
            // Already reordered
        }

        if (action["op"] === "update") {
            // Already updated

        }

        if (action["op"] === "delete") {
            // Already deleted
        }
    }
}


function blockDefinitionMerger(article: ArticleInstance, original: BlockBase, newer: BlockDef, depth: number = 0) {
    //
    // Merge a parsed block definition with the currently displayed block definition
    //
    //  This will create insert, update, delete action to be executed by the backend
    //
    const keys = new Set([
        ...Object.keys(original.def),
        ...Object.keys(newer)
    ]);

    const skipKeys = new Set([
        "id", "page_id", "parent", "children", "parent_id",
        "sequence"
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
        }
        // Updated fields
        else if (oValue !== nValue) {
            original.def[key] = nValue;
            wasModified = true;
        }
        // Deleted fields
        else if (nValue === undefined) {
            original.def[key] = undefined;
            wasModified = true;
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
                article.insertBlock(original, original.children[oChildrenCount - 1], 'after', newer.children.slice(sharedCount))
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
        article.insertBlock(original, null, 'after', newer.children)
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
    inputBlock: BlockBase

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
        this.inputBlock = newBlock(this, { kind: "input", data: { text: "" }, sequence: this.children.length }, this)

        // Extra block used for direct insertion
        //  This COULD be not correct because this block does not exist on the DB
        //  but as soon as something is written to it it should be inserted
        // this.children.push()

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


    _fillMissingSequence(siblings: ArticleDef[]) {
        for (let i = 0; i < siblings.length; i++) {
            const child = siblings[i];
            if (typeof child.sequence !== "number") {
                // If no sequence, use current index + 1
                child.sequence = i + 1;
            }
        }

        let previous = -10000000;

        for (let i = 0; i < siblings.length; i++) {
            const child = siblings[i];
            console.log(child.sequence)

            if (child.sequence < previous) {
                console.log("BAD LOGIC")
            }
            previous = child.sequence
        }
    }


    getDefinitionChildren(): BlockDef[] {
        return this.def.blocks;
    }

    static _getSequenceStep(parent: ArticleBlock, target: BlockBase | null, direction: "after" | "before", newChildren: BlockDef[]) {
        //
        // returns a sequence of integer that will make the children rightly ordered
        //
        //  FIXME: The sequence number resets on nested sub-blocks so sub-blocks appear before their parents
        //  causing the tree rebuilding to run for more loops than necessary
        //  we need for force sub-blocks to always appear AFTER their parents, so their start sequence should be
        //  parent.sequence + 1. The end sequence does not matter as much
        //
        //
        //
        if (!Array.isArray(parent.def["children"])) {
            parent.def["children"] = [];
        }

        const siblings = parent.getDefinitionChildren();
        console.log("siblings", siblings)

        let start: number = 0;
        let end: number = newChildren.length;
        let insertIndex: number;

        if (siblings.length !== parent.children.length) {
            console.log("ERROR children size mismatch", siblings.length, parent.children.length)
            console.log("ERROR children size mismatch", parent)
        }

        if (target === null) {
            start = -1
            end = newChildren.length
            insertIndex = 0
        }
        else if (target.kind === "input") {
            insertIndex = parent.def.children.length - 1
            start = parent.def.children[insertIndex].sequence
            end = start + newChildren.length + 1
        }
        else {
            let targetIndex = parent.children.indexOf(target);
            if (targetIndex === -1) {
                throw new Error("Target block not found in parent");
            }

            if (direction === "after") {
                insertIndex = targetIndex + 1;

                if (targetIndex + 1 === siblings.length) {
                    start = target.def.sequence;
                    end = start + newChildren.length + 1;
                }
                else {
                    start = target.def.sequence;
                    end = siblings[targetIndex + 1].sequence;
                }
            } else {
                insertIndex = targetIndex;

                if (targetIndex === 0) {
                    end = target.def.sequence;
                    start = end - (newChildren.length + 1);
                } else {
                    start = siblings[targetIndex - 1].sequence;
                    end = target.def.sequence;
                }
            }
        }

        if (start === end) {
            console.log("Logic Error")
            if (direction === "after") {
                end = start + 0.1
            }
            if (direction === "before") {
                end = start - 0.1
            }
        }

        return [insertIndex, start, end]
    }


    static fixSequenceRecursively(obj: BlockDef) {
        if (obj.children) {
            for (let i = 0; i < obj.children.length; i++) {
                if (obj.children[i] !== undefined) {
                    obj.children[i].sequence = i
                    ArticleInstance.fixSequenceRecursively(obj.children[i]);
                }
            }
        }
    }

    //
    // Set sequence ID so the order is correct when the article is fetched back
    // It return an array operation (function) to be applied to the children array of the parent
    // to insert the new chilren in the right place
    //
    //  1. Sequence is set so database has the right order
    //  2. New block are inserted into the parent in the right order
    //  3. Update batch is sent to server
    //  4. Server replies with new id for the inserted blocks
    //
    getBlockInserter(parent: ArticleBlock, target: BlockBase | null, direction: "after" | "before", newChildren: BlockDef[]) {

        const [insertIndex, start, end] = ArticleInstance._getSequenceStep(parent, target, direction, newChildren)

        console.log("Sequence STEP", insertIndex, start, end)

        const step = (end - start) / (newChildren.length + 1)

        for (let i = 0; i < newChildren.length; i++) {
            newChildren[i].sequence = start + (i + 1) * step
            ArticleInstance.fixSequenceRecursively(newChildren[i])
        }

        const insert = () => {
            parent.getDefinitionChildren().splice(insertIndex, 0, ...newChildren);
        }

        const fetch = (array: ArticleBlock[]) => {
            const blocksSlice = array.slice(insertIndex, insertIndex + newChildren.length);
            return blocksSlice;
        };

        const remove = (array: ArticleBlock[]) => {
            const blocksSlice = array.splice(insertIndex, newChildren.length);
            return blocksSlice;
        };

        return [insert, fetch, remove]
    }

    insertBlock(parent: ArticleBlock, target: BlockBase | null, direction: "after" | "before", newChildren: BlockDef[]) {
        if (newChildren === undefined || newChildren.length <= 0) {
            return
        }

        const oldDef = parent.def
        let futureAction: PendingAction = {
            action: undefined,
            doAction: undefined,
            undoAction: undefined,
            blocks: []
        }

        console.log("BEFORE", newChildren)
        let [insertFn, fetchFn, removeFn] = this.getBlockInserter(parent, target, direction, newChildren)
        console.log("AFTER", newChildren)

        // How to execute the action on the current view
        const doAction = () => {
            // Fix the sequence so the blocks are in the right order
            // and insert the new children to the definition
            const oldCount = parent.children.length
            const oldCountDef = parent.def["children"]
            insertFn()

            const newCount = parent.children.length
            const newCountDef = parent.def["children"]

            console.log(newChildren)
            console.log(oldCount, newCount)
            console.log(oldCountDef, newCountDef)

            parent.children = parent.getDefinitionChildren().map(child => newBlock(this, child, parent))
            console.log(parent.children.length)
            console.log(parent)

            // Fetch the inserted blocks so we can populate the ID frm the database
            // const startCount = insertIndex + 1
            futureAction.blocks = fetchFn(parent.children)
            // console.log(futureAction.blocks)
            // console.log(startCount, startCount + newChildren.length)
            // console.log(parent.children.length)
            parent.notify()
        }

        // How to revert the action on the current view
        const undoAction = () => {
            parent.def = oldDef
            removeFn(parent.children);
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

        console.log("Action was generated")
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

    public fetchReferenceByID(blockID: string | number): BlockBase {
        for (const block of this.children) {
            if (block.def.id === blockID) {
                return block;
            }
        }
        throw new Error(`Block with id ${blockID} not found`);
    }

    updateTitle(newTitle: string) {
        let oldTitle = this.def.title;

        const doAction = () => {
            this.def.title = newTitle;
            this.notify();
        }

        const undoAction = () => {
            this.def.title = oldTitle;
            this.notify();
        }

        const remoteAction: ActionUpdateArticle = {
            op: "update_article",
            title: newTitle
        }

        this.pushAction({
            action: remoteAction,
            doAction: doAction,
            undoAction: undoAction
        })
    }

    async persistServerChange() {
        if (this.pendingChange.length === 0) {
            return;
        }

        try {
            // Extract actions from pending changes
            const queuedChange = [...this.pendingChange];
            this.pendingChange = [];

            // Filter out article updates from block updates
            const blockActions = queuedChange.filter(p => p.action.op !== "update_article").map(pending => pending.action);
            const articleActions = queuedChange.filter(p => p.action.op === "update_article").map(pending => pending.action as ActionUpdateArticle);

            const promises = [];

            if (blockActions.length > 0) {
                // Make request to the server for blocks
                promises.push(recipeAPI.updateBlocksBatch(blockActions)
                    .then(updateResult => {
                        // Filter queuedChange to only include block actions for reconciliation
                        const blockQueuedChange = queuedChange.filter(p => p.action.op !== "update_article");
                        blockUpdateReconciliation(this, blockQueuedChange, updateResult);
                    }));
            }

            if (articleActions.length > 0) {
                // We only need to send the last title update if there are multiple
                const lastAction = articleActions[articleActions.length - 1];
                promises.push(recipeAPI.updateArticle(this.def.id, { title: lastAction.title }));
            }

            await Promise.all(promises);

            // On success, clear the pending changes
            // this.changeHistory["actions"].push(...this.pendingChange);
            this.saveUncomittedChange();
        } catch (error) {
            console.error('Failed to persist changes:', error);
            // On error, keep pending changes for retry
            // FIXME: This logic is slightly flawed if partial success, but good enough for now
            throw error;
        }
    }

    react() {
        return ArticleView({ article: this })
    }
}


interface ArticleProps {
    article: ArticleDef
}


import { VegaProvider } from '../../contexts/VegaContext';

const TitleDisplay: React.FC<{ article: ArticleInstance }> = ({ article }) => {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [text, setText] = useState(article.def.title);

    // Update local state when model changes (e.g. undo/redo)
    useEffect(() => {
        setText(article.def.title);
    }, [article.def.title]);

    const mode = hovered || focused ? "edit" : "view";

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setText(e.target.value);
        // We update the model immediately so it feels responsive and auto-saves
        article.updateTitle(e.target.value);
    }

    if (mode === "view") {
        return (
            <Heading
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={() => setFocused(true)}
                mb={4}
            >
                {article.def.title}
            </Heading>
        )
    }

    return (
        <Box
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            mb={4}
        >
            <Input
                value={text}
                onChange={onChange}
                onBlur={() => setFocused(false)}
                autoFocus
                size="lg"
                fontWeight="bold"
                fontSize="3xl" // Matches default Heading size roughly but can adjust if needed
            />
        </Box>
    )
}

const Article: React.FC<ArticleProps> = ({ article }) => {
    const instanceRef = useRef<ArticleInstance | null>(null);

    if (!instanceRef.current) {
        instanceRef.current = new ArticleInstance(article);
    }

    return (
        <VegaProvider>
            <ArticleView article={instanceRef.current} />
        </VegaProvider>
    );
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
        const rerender = () => {
            console.log("Re render", article.children)
            setTick(t => t + 1);
        }
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

    return (
        <Flex gap={6} align="start" overflowX="auto" width="100%">
            {/* Main Article Content */}
            <Box flex="1" minW="0">
                <TitleDisplay article={article} />
                {renderSortedBySequence(article.children)}
                {article.inputBlock.react()}
            </Box>

            {/* Right Sidebar */}
            <Box width="300px" flexShrink={0} pl={4} borderLeft="1px solid" borderColor="gray.100">
                <SubPageList articleDef={article.def} />
            </Box>
        </Flex>
    );
};
