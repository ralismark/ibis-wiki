import { useContext, useEffect, useState } from "react";
import CodeMirror from "../codemirror/CodeMirror";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { BackendContext } from "../backend";

const loadingState = EditorState.create({
  doc: "loading...",
  extensions: [
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
  ],
});

export default function IbisCard({ path, onRemove }: { path: string, onRemove: () => void }) {
  const docs = useContext(BackendContext);
  const [view, setView] = useState<EditorView | null>(null);

  useEffect(() => {
    if (!view || !docs) return;

    view.setState(loadingState);
    docs.open(path).then(f => {
      view.setState(f.state());
    });
  }, [view, docs]);

  // Passing setView as ref to CodeMirror is so janky but it's the only way
  // that I've found which works...
  return (
    <article className="ibis-card" data-path={path}>
      <h1>
        {path}
        <a href="" role="button" onClick={e => { e.preventDefault(); onRemove() }}>×</a>
      </h1>
      <CodeMirror ref={setView} />
    </article>
  );
}
