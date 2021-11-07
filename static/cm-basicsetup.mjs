// our own basic setup
import {EditorView, keymap, highlightSpecialChars, drawSelection, highlightActiveLine} from "https://cdn.skypack.dev/@codemirror/view@^0.19.0";
import {history, historyKeymap} from "https://cdn.skypack.dev/@codemirror/history@^0.19.0";
import {defaultKeymap} from "https://cdn.skypack.dev/@codemirror/commands@^0.19.0";
import {bracketMatching} from "https://cdn.skypack.dev/@codemirror/matchbrackets@^0.19.0";
import {closeBrackets, closeBracketsKeymap} from "https://cdn.skypack.dev/@codemirror/closebrackets@^0.19.0";
import {defaultHighlightStyle} from "https://cdn.skypack.dev/@codemirror/highlight@^0.19.0";
import {indentService} from "https://cdn.skypack.dev/@codemirror/language@^0.19.0";

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
