import { useContext, useEffect, useRef, useState } from "react";
import { File, BackendContext } from "../backend";
import { useExtern, useExternOr } from "../extern";

export default function IbisCard({ path, onRemove }: { path: string, onRemove: () => void }) {
  const docs = useContext(BackendContext);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    docs?.open(path).then(f => setFile(f));
  }, [docs]);

  const ref = useRef(null);
  const conflicting = useExternOr(file?.isConflicting, false);

  useEffect(() => {
    return file?.esr.attach(ref);
  }, [file, ref]);

  // Passing setView as ref to CodeMirror is so janky but it's the only way
  // that I've found which works...
  return (
    <article className="ibis-card" data-path={path}>
      <h1>
        {path}
        <a href="" role="button" onClick={e => { e.preventDefault(); onRemove() }}>×</a>
      </h1>
      {conflicting && <>
        <button
          onClick={() => file!.resolveConflict()}
        >Finish Merging</button>
      </>}
      <div ref={ref}>
        {!file && "loading..."}
      </div>
    </article>
  );
}
