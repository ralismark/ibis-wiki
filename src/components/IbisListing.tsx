import { Fragment, useContext, useEffect, useState } from "react"
import { useExtern, useExternOr } from "../extern"
import { IbisController } from "../App"
import { FacadeExtern } from "../backend"

export function IbisListing(props: {
  filter?: (path: string) => boolean,
}) {
  const filter = props.filter ?? (() => true)

  const controller = useExtern(IbisController)
  const facade = useExtern(FacadeExtern);
  const listing = useExternOr(facade?.listing, new Set());

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<string[]>([])

  useEffect(() => {
    facade?.fts.search(query).then(setResults)
  }, [facade, query])

  const shownPaths = query ? results : Array.from(listing).filter(filter)

  return <div className="ibis-listing">
    <input
      value={query}
      onChange={e => setQuery(e.target.value)}
      placeholder="Search..."
    />

    <div>
      {shownPaths.map(path => <Fragment key={path}>
        <a
          href=""
          onClick={e => {
            e.preventDefault()
            controller.open(path)
          }}
        >
          {path}
        </a>
        {" "}
      </Fragment>)}
    </div>
  </div>
}
