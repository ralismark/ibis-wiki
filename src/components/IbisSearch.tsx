import { useEffect, useMemo, useState } from "react"
import "./IbisSearch.css"
import { FacadeExtern } from "../backend"
import { IbisController } from "../App"
import { useExtern, useExternOr } from "../extern"

type Suggestion = [string, JSX.Element, () => void]

export function IbisSearch() {
  const controller = useExtern(IbisController)
  const facade = useExtern(FacadeExtern)
  const [queryOrig, setQuery] = useState("")
  const query = queryOrig.trim()

  const renderSug = ([key, content, cb]: Suggestion) => <li
    key={key}
    onClick={e => {
      e.preventDefault()
      cb()
      setQuery("")
    }}
  >{content}</li>

  const listingSugs: Suggestion[] = useMemo(() => {
    // we don't use useExtern here since we don't wanna recalculate search
    // suggestions whenever the listing changes
    const listing = facade?.listing.getSnapshot();
    if (!listing) return []

    const parts = query.toLowerCase().split(/\s+/).filter(x => x !== "")
    if (parts.length === 0) return []
    return Array.from(listing)
        .filter(path => parts.every(part => path.toLowerCase().includes(part)))
        .map(path => [
          "card-title/" + path,
          <>{path}</>,
          () => controller.open(path),
        ])
  }, [query])

  const [searchSugs, setSearchSugs] = useState<Suggestion[]>([])
  useEffect(() => {
    facade?.fts.search(query).then(results => {
      setSearchSugs(results.map(path => [
        "search/" + path,
        <>{path}</>,
        () => controller.open(path),
      ]))
    })
  }, [facade, query])

  return <search className="ibis-search">
    <input
      type="search"
      value={queryOrig}
      onChange={e => setQuery(e.target.value)}
      onKeyDown={e => {
        if (e.code === "Escape") setQuery("")
      }}
      autoComplete="off"
      placeholder="Search"
    />
    {query && <div className="results">
      <ul>
        {renderSug(["", <>Open card "{query}"</>, () => controller.open(query)])}
      </ul>
      {listingSugs.length > 0 && <>
        <p className="search-section">Title matches:</p>
        <ul>
          {listingSugs.map(renderSug)}
        </ul>
      </>}
      {searchSugs.length > 0 && <>
        <p className="search-section">Content matches:</p>
        <ul>
          {searchSugs.map(renderSug)}
        </ul>
      </>}
    </div>}
  </search>
}
