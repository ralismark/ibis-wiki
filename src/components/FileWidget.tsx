import { useEffect, useRef, useState } from "react"
import { FacadeExtern, File } from "../backend"
import { useExtern, useExternOr } from "../extern"
import { WidgetControl, Widget } from "./Widget"

export class FileWidget implements Widget {
  readonly path: string

  constructor(path: string) {
    this.path = path
  }

  show(ctl: WidgetControl): [JSX.Element, JSX.Element] {
    const facade = useExtern(FacadeExtern)
    const [file, setFile] = useState<File | null>(null)

    useEffect(() => {
      if (facade) {
        // Get the file from the facade and setFile it.
        // To close, we need to wait for the file to get loaded in order to call abort on it.
        // That's why close is a promise that resolves to a function
        const close = facade.openFile(this.path).then(f => {
          setFile(f)
          return () => f.abort.abort()
        });
        return () => {
          close.then(fn => fn())
        }
      }
    }, [facade]);

    const conflicting = useExternOr(file?.isConflicting, false);

    // load backlinks once, we don't need it to update whenever everything loads
    // (we need useState since it's async)
    const [backlinks, setBacklinks] = useState<string[]>([])
    useEffect(() => {
      facade?.fts.backlinks(this.path).then(setBacklinks)
    }, [facade])

    const ref = useRef(null)
    // attach opened file to element
    useEffect(() => {
      return file?.esr.attach(ref);
    }, [file, ref]);

    return [
      <>{this.path}</>,
      <>
        {conflicting && <>
          <button
            onClick={() => file!.resolveConflict()}
          >Finish Merging</button>
        </>}

        <section ref={ref}>
          {!file && "loading..."}
        </section>

        {backlinks.length > 0 && <p>
          {backlinks.length} backlink{backlinks.length !== 1 && "s"}{": "}

          {backlinks.map(p => <button key={p} onClick={() => ctl.open(new FileWidget(p))}>{p}</button>)}
        </p>}

      </>,
    ]
  }

  typename(): string {
      return "FileWidget"
  }
}
