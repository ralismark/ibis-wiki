import { useContext, useEffect, useState } from "react";
import CodeMirror from "./CodeMirror";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { DocumentProviderContext } from "../DocumentProvider";

const loadingState = EditorState.create({
  doc: "loading...",
  extensions: [
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
  ],
});

export default function IbisCard({ slug, onRemove }: { slug: string, onRemove: () => void }) {
  const docs = useContext(DocumentProviderContext);
  const [view, setView] = useState<EditorView | null>(null);

  useEffect(() => {
    if (!view) return;

    view.setState(loadingState);
    docs!.open(slug).then(s => {
      view.setState(s);
    });
  }, [view]);

  // Passing setView as ref to CodeMirror is so janky but it's the only way
  // that I've found which works...
  return (
    <article className="ibis-card">
      <h1>
        {slug}
        <a href="#" role="button" onClick={onRemove}>×</a>
      </h1>
      <CodeMirror ref={setView} />
    </article>
  );
}
