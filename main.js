import * as state from "@codemirror/state"
import * as view from "@codemirror/view"
import * as commands from "@codemirror/commands"

// our own basic setup
import {EditorView, keymap, highlightSpecialChars, drawSelection, highlightActiveLine} from "@codemirror/view"
import {history, historyKeymap} from "@codemirror/history"
import {defaultKeymap} from "@codemirror/commands"
import {bracketMatching} from "@codemirror/matchbrackets"
import {closeBrackets, closeBracketsKeymap} from "@codemirror/closebrackets"
import {defaultHighlightStyle} from "@codemirror/highlight"

// our own parser
import {parser} from "./mdm.grammar"
import {LezerLanguage, LanguageSupport} from "@codemirror/language"
import {styleTags, tags as t} from "@codemirror/highlight"

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

function longParse(str) {
  const parsed = parser.parse(str);
  return printTree(parsed, str);
}

const lang = LezerLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        Preamble: t.monospace,

        Header: t.heading1,
        ATXMeta: t.meta,

        Blockquote: t.quote,
        BlockquoteMeta: t.meta,

        Codeblock: t.monospace,
        CodeblockFence: t.meta,
        CodeSpan: t.monospace,

        S1: t.emphasis,
        S2: t.strong,

        // RefOpen: t.meta,
        // RefClose: t.meta,
        RefIdent: t.link,

        // AngOpen: t.meta,
        // AngClose: t.meta,
        AngIdent: t.link,
      }),
    ],
  }),

  languageData: {
  },
});

function filetype() {
  return new LanguageSupport(lang);
}

window.CM = {
  state,
  view,
  commands,
  filetype,
  longParse,
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
  ],
};
