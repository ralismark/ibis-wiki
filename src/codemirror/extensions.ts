import "./codemirror.css"
import { EditorView, keymap, highlightSpecialChars, drawSelection, highlightActiveLine, Decoration } from "@codemirror/view";
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
              const url = sliceDoc(from, to).trim()
              open(url, "_blank", "noopener,noreferrer")
            }
          })
        )
      }
    }
  }),
];
export default extensions;
