import "./FileWidget.css"
import { useEffect, useMemo, useRef, useState } from "react"
import { FacadeExtern, File } from "../backend"
import { useExtern, useExternOr } from "../extern"
import { WidgetControl, IWidget } from "./Widget"
import { shortdate, today } from "../util/calendar"

export class FileWidget implements IWidget {
  readonly path: string

  constructor(path: string) {
    this.path = path
  }

  className(): string { return "FileWidget" }

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

    const ref = useRef(null)
    // attach opened file to element
    useEffect(() => {
      return file?.esr.attach(ref);
    }, [file, ref]);

    const conflicting = useExternOr(file?.isConflicting, false);

    // bottom meta

    // load backlinks once, we don't need it to update whenever everything loads
    // (we need useState since it's async)
    const [backlinks, setBacklinks] = useState<string[]>([])
    useEffect(() => {
      facade?.fts.backlinks(this.path).then(setBacklinks)
    }, [facade])

    const subpages = useMemo(() => {
      if (!facade) return []
      return Array.from(facade.listing.getSnapshot().values())
          .filter(p => p.startsWith(this.path + ":"))
    }, [facade])

    const superpages = useMemo(() => {
      if (!facade) return []
      return Array.from(facade.listing.getSnapshot().values())
          .filter(p => this.path.startsWith(p + ":"))
    }, [facade])

    const bottomMeta: [string, string[]][] = [
      ["sub", subpages],
      ["super", superpages],
      ["backlinks", backlinks],
    ]

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

        <ul>
          {bottomMeta.map(([key, items]) => items.length > 0 && <li key={key}>
            {key} ({items.length}):{" "}
            {items.map(p => <button
              key={p}
              onClick={() => ctl.open(new FileWidget(p))}
            >{p}</button>)}
          </li>)}
        </ul>

      </>,
    ]
  }
}

export class TodayWidget extends FileWidget {
  constructor() {
    super(shortdate(today))
  }

  show(ctl: WidgetControl): [JSX.Element, JSX.Element] {
    const [, body] = super.show(ctl)
    return [
      <>Today: {this.path}</>,
      body,
    ]
  }
}
