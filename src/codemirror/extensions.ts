import { EditorView, keymap, highlightSpecialChars, drawSelection, highlightActiveLine } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap, indentWithTab } from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { bracketMatching, defaultHighlightStyle, indentService, indentUnit, syntaxHighlighting } from "@codemirror/language";
import markdown from "./markdown";
import { Extension } from "@codemirror/state";

const extensions: Extension = [
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
    indentWithTab,
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
  ]),
  indentService.of(() => 0), // no indent
  indentUnit.of("    "), // 4-space indent
];
export default extensions;
