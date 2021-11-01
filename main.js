import * as state from "@codemirror/state"
import * as view from "@codemirror/view"
import * as commands from "@codemirror/commands"
import * as highlight from "@codemirror/highlight"

// our own basic setup
import {EditorView, keymap, highlightSpecialChars, drawSelection, highlightActiveLine} from "@codemirror/view"
import {history, historyKeymap} from "@codemirror/history"
import {defaultKeymap} from "@codemirror/commands"
import {bracketMatching} from "@codemirror/matchbrackets"
import {closeBrackets, closeBracketsKeymap} from "@codemirror/closebrackets"
import {defaultHighlightStyle} from "@codemirror/highlight"

// our own parser
import * as md from "@lezer/markdown"
import {LRLanguage, LanguageSupport, indentService} from "@codemirror/language"

import {stringInput} from "lezer-tree"

function printTree(
  tree,
  input,
  options = {},
) {
  function focusedNode(cursor) {
    const { type, from, to } = cursor
    return { type, from, to }
  }

  const cursor = tree.cursor()
  if (typeof input === "string") input = stringInput(input)
  const { from = 0, to = input.length, start = 0, includeParents = false } = options
  let output = ""
  const prefixes = []
  for (;;) {
    const node = focusedNode(cursor)
    let leave = false
    if (node.from <= to && node.to >= from) {
      const enter = !node.type.isAnonymous && (includeParents || (node.from >= from && node.to <= to))
      if (enter) {
        leave = true
        const isTop = output === ""
        if (!isTop || node.from > 0) {
          output += (!isTop ? "\n" : "") + prefixes.join("")
          const hasNextSibling = cursor.nextSibling() && cursor.prevSibling()
          if (hasNextSibling) {
            output += " ├─ "
            prefixes.push(" │  ")
          } else {
            output += " └─ "
            prefixes.push("    ")
          }
        }
        output += node.type.isError ? "! " + node.type.name : node.type.name
      }
      const isLeaf = !cursor.firstChild()
      if (enter) {
        const hasRange = node.from !== node.to
        output +=
          " " +
          (hasRange
            ? "[" +
              (start + node.from) +
              ".." +
              (start + node.to) +
              "]"
            : (start + node.from))
        if (hasRange && isLeaf) {
          output += ": " + JSON.stringify(input.read(node.from, node.to))
        }
      }
      if (!isLeaf) continue
    }
    for (;;) {
      if (leave) prefixes.pop()
      leave = cursor.type.isAnonymous
      if (cursor.nextSibling()) break
      if (!cursor.parent()) return output
      leave = true
    }
  }
}

function longParse(parser, str) {
  const parsed = parser.parse(str);
  return printTree(parsed, str);
}

window.CM = {
  state,
  view,
  commands,
  md,
  makeLang: x => new LanguageSupport(LRLanguage.define(x)),
  longParse,
  highlight,
  basicSetup: [
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
  ],
};
