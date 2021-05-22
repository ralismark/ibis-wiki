"use strict";

console.log("test.js");

const {EditorState, Annotation, Transaction} = CM.state;
const {EditorView, PluginValue, ViewPlugin} = CM.view;

function syncPlugin() {
  const listeners = new Set();
  const downstream = Annotation.define(Boolean);

  const plugin = ViewPlugin.define((v) => {
    listeners.add(v);
    return {
      update(viewupdate) {
        // avoid update loops
        if(viewupdate.changes.empty) return;
        for(const tr of viewupdate.transactions) {
          if(tr.annotation(downstream)) return;
        }

        for(let other of listeners) if(other !== v) {
          other.dispatch({
            changes: viewupdate.changes,
            annotations: downstream.of(true),
          });
        }

        plugin.state = viewupdate.state;
      },

      destroy() {
        listeners.delete(v);
      },
    };
  });

  return plugin;
}

const sync = syncPlugin();
sync.state = EditorState.create({
  doc: "hello world",
  extensions: [CM.basicSetup, sync],
});

function spawn() {
  new EditorView({
    state: sync.state,
    parent: document.body,
  });
}
