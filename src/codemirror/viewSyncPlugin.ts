import { EditorView, PluginValue, ViewPlugin } from "@codemirror/view";
import { Annotation, EditorState } from "@codemirror/state";

// viewSyncPlugin creates a new instance of a view plugin, that synchronises
// the state of all views build from this state.
export default function viewSyncPlugin(
  onStateChange?: (state: EditorState) => void,
): ViewPlugin<PluginValue> {
  const views = new Set<EditorView>();
  const downstream = Annotation.define<boolean>(); // to avoid update loops

  if (onStateChange === undefined)
    onStateChange = (_: EditorState) => {};

  return ViewPlugin.define(self => {
    views.add(self);
    return {
      update(viewUpdate) {
        if (viewUpdate.changes.empty) return;

        // avoid update loops
        if (viewUpdate.transactions.some(tr => tr.annotation(downstream))) return;

        onStateChange!(viewUpdate.state);

        // send updates to other views
        for (let o of views) if (o !== self) {
          o.dispatch({
            changes: viewUpdate.changes,
            annotations: downstream.of(true),
          });
        }
      },

      destroy() {
        views.delete(self);
      },
    };
  });
}
