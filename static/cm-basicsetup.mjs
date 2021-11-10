// our own basic setup
import {EditorView, keymap, highlightSpecialChars, drawSelection, highlightActiveLine} from "@codemirror/view";
import {history, historyKeymap} from "@codemirror/history";
import {defaultKeymap} from "@codemirror/commands";
import {bracketMatching} from "@codemirror/matchbrackets";
import {closeBrackets, closeBracketsKeymap} from "@codemirror/closebrackets";
import {defaultHighlightStyle} from "@codemirror/highlight";
import {indentService} from "@codemirror/language";

export default [
  highlightSpecialChars(),
  history(),
  drawSelection(),
  defaultHighlightStyle.fallback,
  bracketMatching(),
  closeBrackets(),
  highlightActiveLine(),
  EditorView.lineWrapping,
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...historyKeymap,
  ]),
  indentService.of(() => 0), // no indent
];
