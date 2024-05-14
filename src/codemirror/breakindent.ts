import { EditorView, Decoration } from "@codemirror/view"
import { EditorState, StateField } from "@codemirror/state"

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

function getDecorations(state: EditorState) {
  const decorations = []

  for (let i = 0; i < state.doc.lines; i++) {
    const line = state.doc.line(i + 1)
    const indentCh = indentSize(line.text)
    if (indentCh === 0) continue

    const linerwapper = Decoration.line({
      attributes: {
        style: `--indent: ${indentCh};`,
        class: "breakindent"
      }
    })

    decorations.push(linerwapper.range(line.from, line.from))
  }

  return Decoration.set(decorations)
}

/**
 * Plugin that makes line wrapping in the editor respect the identation of the line.
 * It does this by adding a line decoration that adds margin-left (as much as there is indentation),
 * and adds the same amount as negative "text-indent". The nice thing about text-indent is that it
 * applies to the initial line of a wrapped line.
 */
const breakindent = StateField.define({
  create(state) {
    return getDecorations(state)
  },
  update(deco, tr) {
    if (!tr.docChanged) return deco
    return getDecorations(tr.state)
  },
  provide: (f) => EditorView.decorations.from(f)
})

export default [
  breakindent.extension,
  EditorView.theme({
    "& .breakindent": {
      // TODO use text-indent: hanging when that's widely available
      paddingLeft: "calc(var(--indent) * 0.25em)",
      textIndent: "calc(var(--indent) * -0.25em)",
    },
  }),
]

