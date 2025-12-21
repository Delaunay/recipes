import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
} from '@chakra-ui/react';
import { Textarea, Input } from '@chakra-ui/react';
import { parseMarkdown } from './markdown';
import { insertAfter } from 'blockly/core/utils/dom';

export interface BlockDef {
  id: number;
  page_id: number;
  parent: number;
  kind: string;
  data: any;
  extension: any;
  children?: Array<BlockDef>;
}

export interface ArticleDef {
  id: number;
  root_id: number;
  parent: number;
  title: string;
  namespace: string;
  tags: any;
  extension: any;
  blocks: Array<BlockDef>;
}


declare class ArticleInstance { }

type BlockCtor = new (owner: ArticleInstance, def: BlockDef) => BlockBase;

class BlockRegistry {
  private static registry = new Map<string, BlockCtor>();

  static register(kind: string, ctor: BlockCtor) {
    if (this.registry.has(kind)) {
      console.warn(`Block kind "${kind}" already registered`);
    }
    this.registry.set(kind, ctor);
  }

  static create(owner: ArticleInstance, def: BlockDef): BlockBase {
    const ctor = this.registry.get(def.kind) ?? UnknownBlock;
    return new ctor(owner, def);
  }
}

export function newBlock(owner: ArticleInstance, def: BlockDef): BlockBase {
  return BlockRegistry.create(owner, def);
}


interface BlockWrapperProps {
  block: BlockBase;
}

interface MarkdownEditorProps {
  text: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onExit?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}

const _objectIds = new WeakMap<object, number>();
let _nextId = 1;

export function getId(obj: object): number {
  if (!_objectIds.has(obj)) {
    _objectIds.set(obj, _nextId++);
  }
  return _objectIds.get(obj)!;
}


const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ text, onChange, onExit }) => {
  const lineCount = text.split("\n").length || 1;

  return (
    <Textarea
      value={text}
      onChange={onChange}
      onBlur={onExit}
      rows={lineCount}
    />
  );
};


const BlockWrapper: React.FC<BlockWrapperProps> = ({ block }) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [markdown, setMarkdown] = useState(block.as_markdown(new MarkdownGeneratorContext()));

  const is_md_ok = block.is_md_representable();
  const mode = focused || hovered ? "edit" : "view";


  const updateBlock = (parsedDef) => {
    block.def = {
      ...block.def,
      ...parsedDef
    }
    block.children = block.def.children ? block.def.children?.map(child => newBlock(block.article, child)) : [];
    console.log("after", block.def)
  }

  const updateMarkdown = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMarkdown(e.target.value)
  }

  const updateBlocks = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseMarkdown(e.target.value);
    
    console.log("parsed", parsed)
    console.log("before", block.def)


    // We are parsing the same type as before, carry on
    if (block.def.kind === parsed.kind) {
      updateBlock(parsed)
    }

    // The markdown parser is parsing a different type:
    //  we might have to insert new blocks
    let blocksToInsert: Array<BlockDef>  = []
    let foundOriginal = false;
    let hasSeparator = false;

    if (parsed.kind === "item") {
      parsed.children.forEach(child => {
        if (child.kind === block.def.kind) {
          updateBlock(child)

          // We need to reset the markdown to be something that ONLY represents this blocks
          setMarkdown(block.as_markdown(new MarkdownGeneratorContext()))
          foundOriginal = true;
        }
        if (child.kind == "separator") {
          hasSeparator = true;
          return
        }
        if (foundOriginal && hasSeparator) {
          blocksToInsert.push(child)
        }
      })
      console.log("Inserting blocks", blocksToInsert)
      block.article.insertBlocksAfterBlock(block, blocksToInsert)
      return
    }
  }

  return (
    <Box
      padding="5px"
      className="TOP_LEVEL_BLOCK"
      display="flex" flexDirection="column" flex="1" minH={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => setFocused(true)} 
      onBlur={() => setFocused(false)}
      tabIndex={0} // makes div focusable
      style={{ outline: focused ? "2px solid blue" : "none" }}
    >
      {is_md_ok && mode === "edit" ? 
        <MarkdownEditor text={markdown} onChange={updateMarkdown} onExit={updateBlocks}></MarkdownEditor> : block.component(mode)}
    </Box>
  );
};

export class MarkdownGeneratorContext {
  level: number = 0

  constructor(lvl: number = 0) {
    this.level = lvl;
  }

  inc() {
    return new MarkdownGeneratorContext(this.level + 1);
  }
}

export abstract class BlockBase {
  static kind: string;
  article: ArticleInstance;
  def: BlockDef;
  children: Array<BlockBase>;
  version: number = 0;
  edit: boolean = false;
  [key: string]: any; // allow arbitrary properties

  protected static register() {
    BlockRegistry.register(
      (this as typeof BlockBase).kind,
      this as unknown as BlockCtor
    );
  }

  constructor(owner: ArticleInstance, block: BlockDef) {
    this.article = owner;
    this.def = block;
    this.children = this.def.children ? this.def.children?.map(child => newBlock(this.article, child)) : [];
    this.version = 0
  }

  set(props: Record<string, any>): this {
    for (const key in props) {
      this[key] = props[key];
    }
    return this;
  }

  component(mode: string): React.ReactNode {
    return (
      <Box
        padding="1px"
        margin="1px"
        border="1px solid"
        borderColor="grey.400"
      >
        {this.def.kind}
        {this.children.map(child => child.react())}
      </Box>
    )
  }

  inline(): React.ReactNode {
    return this.component("view")
  }

  react(): React.ReactNode {
    return <BlockWrapper key={`ev-${getId(this)}`} block={this}></BlockWrapper>
  }

  is_md_representable(): boolean {
    return true;
  }

  as_markdown(ctx: MarkdownGeneratorContext): string {
    return ``
  }
}


export class UnknownBlock extends BlockBase {
  static kind = "unknown";

  static {
    this.register();
  }

  constructor(owner: ArticleInstance, def: BlockDef) {
    super(owner, def);
    console.warn("Unknown block kind:", def.kind);
  }
}

