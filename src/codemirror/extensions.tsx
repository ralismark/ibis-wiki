import "./codemirror.css"
import { EditorView, keymap, highlightSpecialChars, drawSelection, highlightActiveLine, Decoration, WidgetType } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap, indentWithTab } from "@codemirror/commands";
import { acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { bracketMatching, defaultHighlightStyle, indentService, indentUnit, syntaxHighlighting } from "@codemirror/language";
import markdown from "./markdown";
import { Extension } from "@codemirror/state";
import { mergingDoc } from "./merge";
import breakindent from "./breakindent"
import syntaxDecoration from "./syntaxDecoration";
import { SyntaxNodeRef } from "@lezer/common";
import { IbisController } from "../App";
import { FileWidget } from "../components/FileWidget";
import { tryCall } from "../util";

import "katex/dist/katex.min.css"

class ImagePreviewWidget extends WidgetType {
  readonly url: string

  constructor(url: string) {
    super()
    this.url = url
  }

  eq(other: any) {
    return other.url === this.url
  }

  toDOM() {
    const div = document.createElement("div")
    div.classList.add("ImagePreviewWidget")
    const img = document.createElement("img")
    img.src = this.url
    div.appendChild(img)
    return div
  }
}

class KatexWidget extends WidgetType {
  readonly contents: string

  constructor(contents: string) {
    super()
    this.contents = contents
  }

  eq(other: any) {
    return other.contents == this.contents
  }

  toDOM() {
    const span = document.createElement("span")
    span.classList.add("KatexWidget")
    import("katex").then(katex => {
      katex.default.render(this.contents, span, {
        displayMode: false,
        throwOnError: false,
      })
    })
    return span
  }
}

const concealMark = Decoration.mark({
  class: "cm-conceal",
})

const extensions: Extension = [
  autocompletion({
    activateOnTyping: true,
    closeOnBlur: false,
  }),
  mergingDoc,
  markdown,
  highlightSpecialChars(),
  history(),
  drawSelection(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  highlightActiveLine(),
  EditorView.lineWrapping,
  keymap.of([
    {
      key: "Tab",
      run: acceptCompletion,
    },
    indentWithTab,
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
  ]),
  indentService.of(() => 0), // no indent
  indentUnit.of("    "), // 4-space indent
  breakindent,
  EditorView.theme({
    "& .cm-content": {
      fontFamily: "sans-serif",
      textAlign: "initial",
    },
    "&.cm-focused": {
      outline: "none",
    },
    "& .cm-tooltip.cm-tooltip-autocomplete > ul": {
      fontFamily: "sans-serif",
    },
    "& .cm-tooltip": {
      border: "1px solid var(--stroke)",
      backgroundColor: "var(--body-bg)",
    },
    "& .cm-cursor": {
      borderLeftColor: "#aaa",
    },
  }, { dark: true }),

  syntaxDecoration({
    handle: function(
      node: SyntaxNodeRef,
      add: (from: number, to: number, value: Decoration) => void,
      sliceDoc: (from: number, to: number) => string
    ) {
      if (node.name === "RefLink") {
        add(
          node.from + 2,
          node.to - 2,
          Decoration.mark({
            onmousedown(from: number, to: number) {
              const path = sliceDoc(from, to).trim()
              IbisController.getSnapshot().open(new FileWidget(path))
            }
          })
        )
      }

      if (node.name === "URL") {
        add(
          node.from,
          node.to,
          Decoration.mark({
            onmousedown(from: number, to: number) {
              const href = sliceDoc(from, to).trim()
              window.open(href, "_blank", "noopener,noreferrer")
            }
          })
        )
      }

      if (node.name === "Link") {
        const url = node.node.getChild("URL")
        const [open, close] = node.node.getChildren("LinkMark")
        if (url && open && close) {
          const href = sliceDoc(url.from, url.to).trim()

          add(node.from, open.to, concealMark)
          add(
            open.to,
            close.from,
            Decoration.mark({
              attributes: {
                title: href,
              },

              onmousedown(from: number, to: number) {
                window.open(href, "_blank", "noopener,noreferrer")
              }
            }),
          )
          add(close.from, node.to, concealMark)
        }
      }

      if (node.name === "URL") {
        const content = sliceDoc(node.from, node.to)
        const url = tryCall(() => new URL(content))?.value

        const imageSuffixes = [".jpg", ".png"]
        if (url && imageSuffixes.some(s => url.pathname.endsWith(s))) {
          add(
            node.node.parent!.to,
            node.node.parent!.to,
            Decoration.widget({
              widget: new ImagePreviewWidget(content)
            })
          )
        }
      }

      if (node.name == "Math") {
        add(
          node.from,
          node.to,
          concealMark
        )
        add(
          node.to,
          node.to,
          Decoration.widget({
            widget: new KatexWidget(sliceDoc(node.from + 1, node.to - 1)),
          })
        )
      }
    }
  }),
];
export default extensions;
