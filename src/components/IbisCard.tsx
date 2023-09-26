import { useEffect, useRef, useState } from "react";
import { FacadeExtern, File } from "../backend";
import { useExtern, useExternOr } from "../extern";
import "./IbisCard.css"

export function IbisCard({ path, onRemove }: { path: string, onRemove: () => void }) {
  const facade = useExtern(FacadeExtern)
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    facade?.files.open(path).then(f => setFile(f));
  }, [facade]);

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
