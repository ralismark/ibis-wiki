import "./codemirror.css"
import { EditorView, keymap, highlightSpecialChars, drawSelection, highlightActiveLine } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap, indentWithTab } from "@codemirror/commands";
import { acceptCompletion, autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { bracketMatching, defaultHighlightStyle, indentService, indentUnit, syntaxHighlighting } from "@codemirror/language";
import markdown from "./markdown";
import { Extension } from "@codemirror/state";
import { mergingDoc } from "./merge";
import breakindent from "./breakindent"

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
    "& .cm-ibis-link": {
      color: "#7777ee",
      textDecoration: "underline",
      cursor: "pointer",
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
];
export default extensions;
