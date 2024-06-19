import { EditorView, Decoration, ViewPlugin, DecorationSet, ViewUpdate } from "@codemirror/view"
import { EditorState, RangeSetBuilder, StateField } from "@codemirror/state"

class Cache<K, V extends object> {
  entries: Map<K, WeakRef<V>> = new Map()

  get(key: K, fallback: () => V): V {
    let v = this.entries.get(key)?.deref()
    if (v === undefined) {
      v = fallback()
      this.entries.set(key, new WeakRef(v))
    }
    return v
  }
}

const decorationCache = new Cache<number, Decoration>()

function indentSize(line: string): number {
  let indent = 0
  for (const char of line) {
    if (char == "\t") {
      indent += (4 - indent % 4)
    } else if (char == " ") {
      indent += 1
    } else {
      break
    }
  }
  return indent
}

const breakindent = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  get(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()
    for (const {from, to} of view.visibleRanges) {
      for (let pos = from; pos <= to; ) {
        const line = view.state.doc.lineAt(pos)

        const indentCh = indentSize(line.text)
        if (indentCh > 0) {
          const deco = decorationCache.get(indentCh, () => Decoration.line({
            attributes: {
              style: `--indent: ${indentCh}`,
              class: "breakindent",
            },
          }))
          builder.add(line.from, line.from, deco)
        }

        pos = line.to + 1
      }
    }
    return builder.finish()
  }

  constructor(view: EditorView) {
    this.decorations = this.get(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.get(update.view)
    }
  }
}, {
  decorations: v => v.decorations,
})

export default [
  breakindent,
  EditorView.theme({
    "& .cm-line": {
      // TODO use text-indent: hanging when that's widely available?
      paddingLeft: "calc(var(--indent, 0) * 0.25em)",
      textIndent: "calc(var(--indent, 0) * -0.25em)",
    },
  }),
]

