
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box,
} from '@chakra-ui/react';


import {BlockBase, newBlock, ArticleDef} from './base'


import "./blocks/heading"
import "./blocks/paragraph"
import "./blocks/text"
import "./blocks/list"
import "./blocks/item"
import "./blocks/layout"


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
 

const Article : React.FC<ArticleProps> = ({article}) => {
    const instance = new ArticleInstance(article)
    return instance.react()
}

export default Article;

