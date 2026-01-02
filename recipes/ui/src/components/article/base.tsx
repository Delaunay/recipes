import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  HStack,
  Box,
  Grid,
  Heading,
} from '@chakra-ui/react';
import { Button, CloseButton, Dialog, Portal } from "@chakra-ui/react";
import { IconButton, Flex } from "@chakra-ui/react";
import { Trash, GripVertical, Settings } from "lucide-react";
import { Textarea, Input } from '@chakra-ui/react';
import { parseMarkdown } from './markdown';
import {
  Stack,
  Field,
  NumberInput,
} from "@chakra-ui/react"
import type { ArticleInstance } from "./article"


export interface BlockDef {
  id: number;
  page_id: number;
  parent_id?: number;
  kind: string;
  data: any;
  extension: any;
  sequence: number;
  children?: Array<BlockDef>;
}

export interface ArticleDef {
  id: number;
  root_id: number;
  parent_id?: number;
  title: string;
  namespace: string;
  tags: any;
  extension: any;
  blocks: Array<BlockDef>;
}

type BlockCtor = new (owner: ArticleInstance, def: BlockDef, parent?: ArticleBlock) => BlockBase;

class BlockRegistry {
  private static registry = new Map<string, BlockCtor>();

  static register(kind: string, ctor: BlockCtor) {
    if (this.registry.has(kind)) {
      console.warn(`Block kind "${kind}" already registered`);
    }
    this.registry.set(kind, ctor);
  }

  static create(owner: ArticleInstance, def: BlockDef, parent?: ArticleBlock): BlockBase {
    const ctor = this.registry.get(def.kind) ?? UnknownBlock;
    return new ctor(owner, def, parent);
  }
}

export function newBlock(owner: ArticleInstance, def: BlockDef, parent? : ArticleBlock): BlockBase {
  return BlockRegistry.create(owner, def, parent);
}


export interface BlockSetting {

}


interface BlockWrapperProps {
  block: BlockBase;
}

interface MarkdownEditorProps {
  block: BlockBase
}

const _objectIds = new WeakMap<object, number>();
let _nextId = 1;

export function getId(obj: object): number {
  if (!_objectIds.has(obj)) {
    _objectIds.set(obj, _nextId++);
  }
  return _objectIds.get(obj)!;
}


const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ block }) => {
  //
  // Markdown editor for node that are convertible to markdown
  // Allow us to insert new markdown nodes straight into the article
  // or update current nodes
  //
  const [markdown, setMarkdown] = useState(block.as_markdown(new MarkdownGeneratorContext()));
  const lineCount = markdown.split("\n").length || 1;

  const updateBlock = (parsedDef) => {
    block.article.updateBlock(block, parsedDef)
    setMarkdown(block.as_markdown(new MarkdownGeneratorContext()))
  }

  const updateMarkdown = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value)
  }

  const updateBlocks = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const parsed = parseMarkdown(e.target.value);
    
    console.log("parsed", parsed)
    console.log("before", block)

    console.log(block.def.kind, parsed.kind)


    // We are parsing the same type as before, carry on
    if (block.def.kind === parsed.kind) {
      console.log("Upate block inline")
      parsed.children = parsed.children.filter(child => child.kind !== "separator")
      updateBlock(parsed)
      return
    }

    // We are inserting into an empty item
    else if (block.def.kind === "item" && block.children.length === 0) {
      console.log("Add blocks to item")
      block.def.children = [parsed]
      block.children = block.def.children.map(child => newBlock(block.article, child, block));
      return
    }

    // We received multiple blocks
    else if (parsed.kind === "item") {
      console.log("Insert new blocks to")

      // Here we parsed some markdown
      //  the markdown includes the current block that may or may not have been modified
      //  and new blocks added afterwards
      //
      const firstBlock = parsed.children[0]
      const blocksToInsert = parsed.children.slice(1).filter(child => child.kind !== "separator")

      updateBlock(firstBlock)
      setMarkdown(block.as_markdown(new MarkdownGeneratorContext()))
      
      // It needs to insert the children as well
      block.article.insertBlock(block.getParent(), block, blocksToInsert)
      return
    } else {
      // This should be before not after
      block.article.insertBlock(block.getParent(), block, [parsed])
      console.log("Update missed")
    }
  }

  return (
    <Textarea
      value={markdown}
      onChange={updateMarkdown}
      onBlur={updateBlocks}
      rows={lineCount}
      fontFamily="mono"
    />
  );
};



const BlockWrapper: React.FC<BlockWrapperProps> = ({ block }) => {
  //
  // This is the core wrapper
  // Every block gets wrapped with this component
  //  This allows for unified logic for 
  //    Settings
  //    Drag and drop
  //    Delete
  //    Edit/View mode
  //
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const is_md_ok = block.is_md_representable();
  const mode = hovered || focused ? "edit" : "view";

  return (
    <Box
      key={`bx-${block.key}`} 
      padding="5px"
      className="TOP_LEVEL_BLOCK"
      display="flex" flexDirection="column" flex="1" minH={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        setFocused(true)
      }} 
      onBlur={() => setFocused(false)}
      tabIndex={0} // makes div focusable
      position="relative"
      style={{ outline: focused ? "2px solid blue" : "none" }}
      minHeight="2rem"
    >
      {/* Drag handle (left) */}
      <Box
        position="absolute"
        insetInlineStart="-20px"
        insetBlockStart="50%"
        transform="translateY(-50%)"
        opacity={hovered ? "1" : "0.1"}
        cursor="grab"
        transition="opacity 0.15s ease"
      >
        <GripVertical size={16} />
      </Box>

      {/* Config button (top-right) */}
      {block.has_settings() && (
        <Dialog.Root size="cover" placement="center" motionPreset="slide-in-bottom">
          <Dialog.Trigger asChild>
              <IconButton
                position="absolute"
                insetBlockStart="4px"
                insetInlineEnd="4px"
                size="xs"
                variant="ghost"
                aria-label="Configure block"
                opacity={hovered ? 1 : 0}
                transition="opacity 0.15s ease"
                zIndex="1000"
              >
                <Settings size={14} />
              </IconButton>
            </Dialog.Trigger>
            <Portal>
              <Dialog.Backdrop />
              <Dialog.Positioner>
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title>Dialog Title</Dialog.Title>
                  </Dialog.Header>
                  <Dialog.Body margin="10px">
                    {block.settingWithPreview()}
                  </Dialog.Body>
                  {/* <Dialog.Footer>
                    <Dialog.ActionTrigger asChild>
                      <Button variant="outline">Cancel</Button>
                    </Dialog.ActionTrigger>
                    <Button>Save</Button>
                  </Dialog.Footer> */}
                  <Dialog.CloseTrigger asChild>
                    <CloseButton size="sm" />
                  </Dialog.CloseTrigger>
                </Dialog.Content>
              </Dialog.Positioner>
            </Portal>
          </Dialog.Root>
      )}

        {/* Delete button (bottom-right) */}
        <IconButton
          position="absolute"
          bottom="4px"
          right="4px"
          size="xs"
          variant="ghost"
          aria-label="Delete block"
          opacity={hovered ? 1 : 0}
          transition="opacity 0.15s ease"
          zIndex="1000"
          onClick={() => {
            block.article.deleteBlock(block)
          }}
        >
          <Trash size={14} />
        </IconButton>

      {is_md_ok && mode === "edit" ? 
        <MarkdownEditor key={`md-${block.key}`} block={block}></MarkdownEditor> : block.component(mode)}
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

function _uniqueKey() {
  let counter = 0
  return function () {
    return counter++;
  }
}

let keyCounter = _uniqueKey()


export abstract class ArticleBlock {
  static kind: string;

  def: any = {}

  children: Array<ArticleBlock> = []

  article: any

  abstract notify(): void
}

export abstract class BlockBase implements ArticleBlock {
  static kind: string
  article: ArticleInstance;
  def: BlockDef;
  children: Array<BlockBase>;
  version: number = 0;
  edit: boolean = false;
  key: number = keyCounter();
  [key: string]: any; // allow arbitrary properties

  protected static register() {
    BlockRegistry.register(
      (this as typeof BlockBase).kind,
      this as unknown as BlockCtor
    );
  }

  public getSequence() {
    return this.def.sequence ?? this.def.id;
  }

  constructor(owner: ArticleInstance, block: BlockDef, parent?: BlockBase) {
    this.parent = parent
    this.article = owner;
    this.def = block;
    this.children = this.def.children ? this.def.children?.map(child => newBlock(this.article, child, this)) : [];
    this.version = 0
  }

  public getParent(): ArticleBlock {
    return this.parent
  }

  getParentId(): null | number {
      if (this.parent === this.article) {
        return null;
      }
      return this.parent.def.id
  }

  public getChildren(): ArticleBlock[]  {
    return this.children;
  }

  notify() {
    this.article.notify();
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
    return <BlockWrapper key={`ev-${this.key}`} block={this}></BlockWrapper>
  }

  settingWithPreview(): React.ReactNode { 
    return <Grid templateColumns="1fr 1fr" gap="6" w="100%" h="100%">
      <Box minW="0">
        <Heading>Preview</Heading>
        <Box minW="0" height="100%" border="1px solid">
          {this.react()}
        </Box>
      </Box>

      <Box minW="0">
        <Heading>Settings</Heading>
        {this.settingForm()}
      </Box>
    </Grid>
  }

  settingForm(): React.ReactNode {
    return <AutoBlockSettingsForm 
      schema={this.settings()} 
      values={this.def.data} 
      onSubmit={(data) => this.def.data=data}/>
  }

  settings(): BlockSetting {
    return {}
  }

  has_settings(): boolean {
    // If the block is not md representable then for sure it will have a way to 
    // configure it
    return !this.is_md_representable();
  }

  is_md_representable(): boolean {
    return true;
  }

  as_markdown(ctx: MarkdownGeneratorContext): string {
    return ``
  } 

  is_definition_same(other: BlockDef): boolean {
    console.log("CMP", this.def, other)

    if (this.kind != other.kind) {
      return false
    }
    
    return this.def == other
  }
}


export class UnknownBlock extends BlockBase {
  static kind = "unknown";

  static {
    this.register();
  }

  constructor(owner: ArticleInstance, def: BlockDef, parent?: BlockBase) {
    super(owner, def, parent);
    console.warn("Unknown block kind:", def.kind);
  }
}



type SettingsFormProps = {
  schema: BlockSetting
  values: Record<string, any>
  onSubmit: (values: Record<string, any>) => void
}

export function AutoBlockSettingsForm({
  schema,
  values,
  onSubmit,
}: SettingsFormProps) {
  const [state, setState] = useState(values)

  function update(key: string, value: any) {
    setState((s) => ({ ...s, [key]: value }))
    onSubmit(state)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(state)
      }}
    >
      <Stack gap="4" width="100%">
        {Object.entries(schema).map(([key, def]) => {
          const label = key[0].toUpperCase() + key.slice(1)

          switch (def.type) {
            case "string":
              return (
                <Field.Root key={key}>
                  <Field.Label>{label}</Field.Label>
                  <Input
                    value={state[key] ?? ""}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </Field.Root>
              )

            case "int":
              return (
                <Field.Root key={key}>
                  <Field.Label>{label}</Field.Label>
                  <NumberInput.Root
                    value={state[key] ?? ""}
                    onValueChange={(v) =>
                      update(key, v.valueAsNumber)
                    }
                  >
                    <NumberInput.Input />
                  </NumberInput.Root>
                </Field.Root>
              )

            default:
              return null
          }
        })}

        <Button type="submit" alignSelf="flex-end">
          Save
        </Button>
      </Stack>
    </form>
  )
}




export interface Action {
  op: string
}

export interface ActionDeleteBlock extends Action {
  op: "delete"
  block_id: number
  index: number
}

export interface ActionUpdateBlock extends Action {
  op: "update"
  id: number
  block_def: BlockDef
}

export interface ActionReorderBlock extends Action {
  op: "reorder"
  block_id: number
  sequence: number
}

export interface ActionInsertBlock extends Action {
  op: "insert"
  page_id: number
  parent: number    // This is where we are going to insert
  children: BlockDef[]
}


export interface ActionInsertBlockReplyChild {
  id: number;
  page_id: number;
  children: ActionInsertBlockReplyChild[]
}

export interface ActionInsertBlockReply {
  action: "insert"
  children: ActionInsertBlockReplyChild[]
}


export interface ActionBatch {
  actions: Action[]
}

export interface PendingAction {
  action: Action;
  doAction: () => void;
  undoAction: () => void;
  blocks?: ArticleBlock[];
}
