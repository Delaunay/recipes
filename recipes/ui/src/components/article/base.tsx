import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  HStack,
  Box,
  Grid,
  Heading,
} from '@chakra-ui/react';
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

  const [markdown, setMarkdown] = useState(block.as_markdown(new MarkdownGeneratorContext()));
  const lineCount = markdown.split("\n").length || 1;

  const updateBlock = (parsedDef) => {
    block.def = {
      ...block.def,
      ...parsedDef
    }
    block.children = block.def.children ? block.def.children?.map(child => newBlock(block.article, child)) : [];
    console.log("after", block.def)
  }

  const updateMarkdown = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value)
  }

  const updateBlocks = (e: React.FocusEvent<HTMLTextAreaElement>) => {
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
    <Textarea
      value={markdown}
      onChange={updateMarkdown}
      onBlur={updateBlocks}
      rows={lineCount}
    />
  );
};

import { Button, CloseButton, Dialog, Portal } from "@chakra-ui/react";

const BlockWrapper: React.FC<BlockWrapperProps> = ({ block }) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const is_md_ok = block.is_md_representable();
  const mode = focused || hovered ? "edit" : "view";

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
        <MarkdownEditor block={block}></MarkdownEditor> : block.component(mode)}
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
