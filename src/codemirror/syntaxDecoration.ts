import { syntaxTree } from "@codemirror/language";
import { Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { SyntaxNodeRef } from "@lezer/common";

export default function syntaxDecoration(spec: {
  handle: (
    node: SyntaxNodeRef,
    add: (from: number, to: number, value: Decoration) => void,
    sliceDoc: (from: number, to: number) => string,
  ) => any,
}): Extension {
  return [
    ViewPlugin.fromClass(class {
      decorations: DecorationSet

      get(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>()
        const tree = syntaxTree(view.state)
        for (const {from, to} of view.visibleRanges) {
          tree.iterate({
            from,
            to,
            enter(node) {
              spec.handle(
                node,
                (from, to, value) => builder.add(from, to, value),
                (from, to) => view.state.sliceDoc(from, to),
              )
            },
          })
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

      onmousedown(ev: MouseEvent, view: EditorView) {
        const pos = view.posAtDOM(ev.target as HTMLElement)
        if (pos === null) return
        this.decorations.between(pos, pos, (from, to, value) => {
          if (value.spec.onmousedown) {
            value.spec.onmousedown(from, to)
          }
        })
      }
    }, {
      decorations: v => v.decorations,

      eventHandlers: {
        mousedown(event, view) {
          return this.onmousedown(event, view)
        }
      }
    })
  ]
}
