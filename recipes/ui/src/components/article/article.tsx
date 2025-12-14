
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box,
} from '@chakra-ui/react';


import { BlockBase, newBlock, ArticleDef } from './base'


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


class ArticleInstance {
    def: ArticleDef;
    blocks: Array<BlockBase>;

    constructor(article: ArticleDef) {
        this.def = article
        this.blocks = this.def.blocks.map(child => newBlock(this, child))
    }

    react() {
        return (
            <Box flex="1">{this.def.title}
                {this.blocks.map(child => child.react())}
            </Box>
        )
    }
}


interface ArticleProps {
    article: ArticleDef
}


const Article: React.FC<ArticleProps> = ({ article }) => {
    const instance = new ArticleInstance(article)
    return instance.react()
}

export default Article;

