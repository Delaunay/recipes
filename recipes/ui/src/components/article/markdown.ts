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


type ArticleBlockDef = {
    kind: string;
    data: any;
    children: ArticleBlockDef[];
};

function makeBlock(kind: string, data: any = {}, children: ArticleBlockDef[] = []): ArticleBlockDef {
    return { kind, data, children };
}

const renderer: Record<string, (token: any) => ArticleBlockDef> = {
    // Block Level
    heading(token: Tokens.Heading): any {
        const hasInline = token.tokens?.length > 0;
        return makeBlock("heading", {
            level: token.depth,
            text: hasInline ? "" : token.text
        }, token.tokens?.map(reconstructBlock) ?? []);
    },
    space(token: Tokens.Space): any {
        return makeBlock("separator", {
            style: null,
            text: ""
        });
    },
    code(token: Tokens.Code): any {
        return makeBlock("code", {
            codeblock_style: token.codeBlockStyle,
            language: token.lang,
            code: token.text,
            escaped: token.escaped
        });
    },
    blockquote(token: Tokens.Blockquote): any {
        return makeBlock("blockquote", {}, token.tokens?.map(reconstructBlock) ?? []);
    },
    html(token: Tokens.HTML | Tokens.Tag): any {
        return makeBlock("html", {
            raw: token.raw,
            text: token.text,
            block: token.block,
            pre: (token as Tokens.HTML).pre
        });
    },
    hr(token: Tokens.Hr): any {
        return makeBlock("hr", { raw: token.raw });
    },
    list(token: Tokens.List): any {
        return makeBlock("list", {
            items: [],
            ordered: token.ordered,
            start: token.start === "" ? 1 : token.start,
            loose: token.loose
        }, token.items.map(reconstructBlock));
    },
    list_item(token: Tokens.ListItem): any {
        let toks = token.tokens ?? [];
        if (toks.length === 1 && toks[0].type === "text" && toks[0].tokens?.length) {
            toks = toks[0].tokens;
        }

        const children = toks.map(reconstructBlock);
        if (token.task && (toks.length === 0 || toks[0].type !== "checkbox")) {
            children.unshift(makeBlock("checkbox", { checked: !!token.checked }));
        }

        return makeBlock("item", {
            text: token.text ?? "",
            task: token.task,
            checked: token.checked,
            loose: token.loose,
            listItem: true
        }, children);
    },
    checkbox(token: Tokens.Checkbox): any {
        return makeBlock("checkbox", { checked: token.checked });
    },
    paragraph(token: Tokens.Paragraph): any {
        const hasInline = token.tokens?.length > 0;
        return makeBlock("paragraph", {
            text: hasInline ? "" : token.text
        }, token.tokens?.map(reconstructBlock) ?? []);
    },
    table(token: Tokens.Table): any {
        const headerLabels = token.header.map((cell, i) =>
            cell.text?.trim() || `Column ${i + 1}`
        );
        const rows = token.rows.map(row => {
            const rowObj: Record<string, string> = {};
            headerLabels.forEach((label, i) => {
                rowObj[label] = row[i]?.text ?? "";
            });
            return rowObj;
        });

        const headerRow = renderer.tablerow({
            text: headerLabels.join(" | "),
            header: true,
            cells: token.header
        });
        const bodyRows = token.rows.map(row => renderer.tablerow({
            text: row.map(cell => cell.text).join(" | "),
            header: false,
            cells: row
        }));

        return makeBlock("table", {
            data: JSON.stringify(rows),
            showHeaders: true,
            align: token.align,
            columns: headerLabels
        }, [headerRow, ...bodyRows]);
    },
    tablerow(token: Tokens.TableRow): any {
        const cells = (token as any).cells as Tokens.TableCell[] | undefined;
        return makeBlock("tablerow", {
            header: (token as any).header ?? false,
            text: token.text
        }, cells ? cells.map((cell) => renderer.tablecell(cell)) : []);
    },
    tablecell(token: Tokens.TableCell): any {
        return makeBlock("tablecell", {
            text: token.text,
            header: token.header,
            align: token.align
        }, token.tokens?.map(reconstructBlock) ?? []);
    },

    // Inline level
    // ===========
    strong(token: Tokens.Strong): any {
        return makeBlock("text", {
            style: "strong",
            text: token.text
        });
    },
    em(token: Tokens.Em): any {
        return makeBlock("text", {
            style: "em",
            text: token.text
        });
    },
    codespan(token: Tokens.Codespan): any {
        return makeBlock("codespan", {
            text: token.text
        });
    },
    br(token: Tokens.Br): any {
        return makeBlock("br");
    },
    del(token: Tokens.Del): any {
        return makeBlock("text", {
            style: "del",
            text: token.text
        });
    },
    link(token: Tokens.Link): any {
        return makeBlock("link", {
            text: token.text,
            url: token.href,
            title: token.title
        }, token.tokens?.map(reconstructBlock) ?? []);
    },
    image(token: Tokens.Image): any {
        return makeBlock("image", {
            url: token.href,
            alt: token.text,
            caption: token.title
        });
    },
    text(token: Tokens.Text | Tokens.Escape | Tokens.Tag): any {
        if (token.type === "text") {
            return makeBlock("text", {
                style: null,
                text: token.text
            }, token.tokens ? token.tokens.map(reconstructBlock) : []);
        }
        return makeBlock("text", {
            style: null,
            text: token.raw ?? ""
        });
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

export function tokenToBlock(token: any) {
    const fun = renderer[token.type];
    if (!fun) {
        return makeBlock("unknown", { raw: token?.raw, type: token?.type });
    }
    return fun(token);
}

function reconstructBlock(token: any) {
    return tokenToBlock(token);
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
