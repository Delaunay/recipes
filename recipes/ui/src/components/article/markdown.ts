import { marked } from 'marked';
import { Tokens } from 'marked';


// Extension to support
//  - https://github.com/UziTech/marked-katex-extension
//  - https://github.com/bent10/marked-extensions/tree/main/packages/footnote
//  - https://github.com/calculuschild/marked-extended-tables
//  - https://github.com/bent10/marked-extensions/tree/main/packages/alert
//
// Maybe
//  - https://github.com/markedjs/marked-custom-heading-id
//  - https://github.com/bent10/marked-extensions/tree/main/packages/directive
//
//  Server only rendering
//  - https://github.com/bent10/marked-extensions/tree/main/packages/code-jsx-renderer


const renderer = {
    // Block Level
    heading(token: Tokens.Heading): any {
        let text = token.text
        if (token.tokens.length > 0) {
            text = ""
        }
        return {
            kind: "heading",
            data: {
                "level": token.depth,
                "text": text
            },
            children: token.tokens.map(reconstructBlock)
        }
    },
    space(token: Tokens.Space): any {
        return {
            kind: "separator",
            data: {
                "style": null,
                "text": ""
            },
            // we want to try to avoid this
            children: []
        }
    },
    code(token: Tokens.Code): any {

    },
    blockquote(token: Tokens.Blockquote): any {

    },
    html(token: Tokens.HTML | Tokens.Tag): any {

    },
    hr(token: Tokens.Hr): any {

    },
    list(token: Tokens.List): any {
        return {
            kind: "list",
            data: {
                items: []
            },
            children: token.items.map(reconstructBlock)
        }
    },
    list_item(token: Tokens.ListItem): any {
        // THis is generating non leaf text nodes
        console.log(token.tokens)
        
        let toks = token.tokens
        if (token.tokens.length == 1 && token.tokens[0].type === "text" && token.tokens[0].tokens.length > 0) {
            toks = token.tokens[0].tokens
        }

        return {
            kind: "item",
            data: {
                text: "", // token.text
            },
            children: toks.map(reconstructBlock)
        }
    },
    checkbox(token: Tokens.Checkbox): any {

    },
    paragraph(token: Tokens.Paragraph): any {
        return {
            kind: "paragraph",
            data: {
            },
            children: token.tokens.map(reconstructBlock)
        }
    },
    table(token: Tokens.Table): any {

    },
    tablerow(token: Tokens.TableRow): any {

    },
    tablecell(token: Tokens.TableCell): any {

    },

    // Inline level
    // ===========
    strong(token: Tokens.Strong): any {
        return {
            kind: "text",
            data: {
                "style": "strong",
                "text": token.text
            },
            children: [], // token.tokens.map(reconstructBlock)
        }
    },
    em(token: Tokens.Em): any {
        return {
            kind: "text",
            data: {
                "style": "em",
                "text": token.text
            },
            children: [], //token.tokens.map(reconstructBlock)
        }
    },
    codespan(token: Tokens.Codespan): any {
        console.log(token.type, token);
    },
    br(token: Tokens.Br): any {
        console.log(token.type, token);
    },
    del(token: Tokens.Del): any {
        console.log(token.type, token);
    },
    link(token: Tokens.Link): any {
        console.log(token.type, token);
    },
    image(token: Tokens.Image): any {
        console.log(token.type, token);
    },
    text(token: Tokens.Text | Tokens.Escape | Tokens.Tag): any {
        if (token.type == "text") {
            return {
                kind: "text",
                data: {
                    "style": null,
                    "text": token.text
                },
                // we want to try to avoid this
                children: token.tokens?.map(reconstructBlock)
            }
        }
    },

}
// marked.use({ renderer });

// export function parseMarkdown(src: string): any {
//     try {
//         return marked.parse(src)
//     } catch {
//         return {}
//     }
// }



// marked.use({ renderer });

function reconstructBlock(token: any) {
    const fun = renderer[token.type]
    console.log("reconstruct", token.type, fun);
    const ret = fun(token)
    console.log("ret", ret);
    return ret;
}



export function parseMarkdown(src: string): any {
    // try {
        const tokens = marked.lexer(src);
        
        const arr = tokens.map(reconstructBlock)
    
        if (arr.length > 1) {
            return {
                kind: "item",
                data: {},
                children: arr
            }
        }

        return arr[0]
    // } catch {
    //     return {}
    // }
}
