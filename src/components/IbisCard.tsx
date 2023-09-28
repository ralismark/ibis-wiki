import { useEffect, useRef, useState } from "react";
import { FacadeExtern, File } from "../backend";
import { useExtern, useExternOr } from "../extern";
import "./IbisCard.css"
import { IbisController } from "../App";

export function IbisCard({ path, onRemove }: { path: string, onRemove: () => void }) {
  const controller = useExtern(IbisController)
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

  const [backlinks, setBacklinks] = useState<string[]>([])
  useEffect(() => {
    facade?.fts.backlinks(path).then(setBacklinks)
  }, [facade, path])

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

      <hr />

      {backlinks.length > 0 && <details>
        <summary>{backlinks.length} backlink{backlinks.length !== 1 && "s"}</summary>
        <ul>
          {backlinks.map(p => <li key={p}>
            <a
              href=""
              onClick={e => { e.preventDefault(); controller.open(p) }}
            >
              {p}
            </a>
          </li>)}
        </ul>
      </details>}
    </article>
  );
}
