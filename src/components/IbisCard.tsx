import { useContext, useEffect, useRef, useState } from "react";
import { BackendContext } from "../backend";
import { EditorStateRef } from "../codemirror/Controlled";

export default function IbisCard({ path, onRemove }: { path: string, onRemove: () => void }) {
  const ref = useRef(null);
  const docs = useContext(BackendContext);
  const [esr, setEsr] = useState<EditorStateRef | null>(null);

  useEffect(() => {
    docs?.open(path).then(f => setEsr(f.state()));
  }, [docs]);

  useEffect(() => {
    return esr?.attach(ref);
  }, [esr, ref]);

  // Passing setView as ref to CodeMirror is so janky but it's the only way
  // that I've found which works...
  return (
    <article className="ibis-card" data-path={path}>
      <h1>
        {path}
        <a href="" role="button" onClick={e => { e.preventDefault(); onRemove() }}>×</a>
      </h1>
      <div ref={ref}>
        {!esr && "loading..."}
      </div>
    </article>
  );
}
