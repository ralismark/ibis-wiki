import { useContext, useEffect, useRef, useState } from "react";
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
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!view) return;

    view.setState(loadingState);
    docs!.open(path).then(f => {
      view.setState(f.state());
    });
  }, [view, docs]);

  useEffect(() => {
    ref.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    (document.activeElement as HTMLElement | undefined)?.blur();
  }, [ref]);

  // Passing setView as ref to CodeMirror is so janky but it's the only way
  // that I've found which works...
  return (
    <article className="ibis-card" data-path={path} ref={ref}>
      <h1>
        {path}
        <a href="#" role="button" onClick={onRemove}>×</a>
      </h1>
      <CodeMirror ref={setView} />
    </article>
  );
}
