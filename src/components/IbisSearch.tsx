import { useEffect, useId, useMemo, useRef, useState } from "react"
import "./IbisSearch.css"
import { FacadeExtern } from "../backend"
import { IbisController } from "../App"
import { useExtern } from "../extern"

type Suggestion = {
  key: string
  content: JSX.Element,
  fn: () => void,
}

// only using this to scroll the option into view when selected
function Option({ suggestion, selected, ...props }: {
  suggestion: Suggestion,
  selected: boolean,
} & React.LiHTMLAttributes<HTMLLIElement>) {
  const ref = useRef<HTMLLIElement | null>(null)

  useEffect(() => {
    if (selected) {
      ref.current?.scrollIntoView({
        block: "nearest",
      })
    }
  }, [ref, selected])

  return <li
    ref={ref}
    {...props}
  >{suggestion.content}</li>
}

export function IbisSearch() {
  const controller = useExtern(IbisController)
  const facade = useExtern(FacadeExtern)
  const [queryOrig, setQuery] = useState("")
  const query = queryOrig.trim()
  const [selected, setSelected] = useState("")

  // reset selection when search cleared
  useEffect(() => {
    if (query === "") setSelected("")
  }, [query])

  // Suggestions --------------------------------------------------------------

  const topSugs: Suggestion[] = [
    {
      key: "",
      content: <>Open card "{query}"</>,
      fn: () => controller.open(query),
    }
  ]

  const listingSugs: Suggestion[] = useMemo(() => {
    // we don't use useExtern here since we don't wanna recalculate search
    // suggestions whenever the listing changes
    const listing = facade?.listing.getSnapshot();
    if (!listing) return []

    const parts = query.toLowerCase().split(/\s+/).filter(x => x !== "")
    if (parts.length === 0) return []
    return Array.from(listing)
        .filter(path => parts.every(part => path.toLowerCase().includes(part)))
        .map(path => ({
          key: "card-title/" + path,
          content: <>{path}</>,
          fn: () => controller.open(path),
        }))
  }, [query])

  const [searchSugs, setSearchSugs] = useState<Suggestion[]>([])
  useEffect(() => {
    facade?.fts.search(query).then(results => {
      setSearchSugs(results.map(path => ({
        key: "search/" + path,
        content: <>{path}</>,
        fn: () => controller.open(path),
      })))
    })
  }, [facade, query])

  // Functions ----------------------------------------------------------------

  const getNextPrev = (): [string, string] => {
    // TODO this could probably be optimised
    const allSugs = [...topSugs, ...listingSugs, ...searchSugs]
    const idx = allSugs.findIndex(({key}) => key === selected)
    if (idx === -1) return ["", ""]
    return [
      allSugs[idx-1]?.key || allSugs[allSugs.length - 1]?.key || "",
      allSugs[idx+1]?.key || "",
    ]
  }

  const accept = () => {
    for (const sugs of [topSugs, listingSugs, searchSugs]) {
      const match = sugs.find(({key}) => key === selected)
      if (match) {
        match.fn()
        setQuery("")
        return
      }
    }
  }

  // UI -----------------------------------------------------------------------

  const resultsId = useId()
  const activeId = useId()

  const renderSug = (s: Suggestion) => <Option
    key={s.key}
    suggestion={s}
    selected={s.key === selected}

    role="option"
    onClick={e => {
      e.preventDefault()
      s.fn()
      setQuery("")
    }}
    onMouseOver={() => setSelected(s.key)}
    aria-selected={s.key === selected}
    id={s.key === selected ? activeId : undefined}
  />

  return <search className="ibis-search">
    <input
      type="search"
      value={queryOrig}
      onChange={e => setQuery(e.target.value)}
      onKeyDown={e => {
        if (e.code === "Escape") setQuery("")
        else if (e.code === "ArrowUp") setSelected(getNextPrev()[0])
        else if (e.code === "ArrowDown") setSelected(getNextPrev()[1])
        else if (e.code === "Enter") accept()
        //else console.log(e.code)
      }}
      autoComplete="off"
      placeholder="Search"
      role="combobox"
      aria-label="Search"
      aria-expanded={query !== ""}
      aria-controls={resultsId}
    />
    {query && <>
      <div
        className="results"
        id={resultsId}
        role="listbox"
        aria-activedescendant={activeId}
      >
        <ul role="group">
          {topSugs.map(renderSug)}
        </ul>
        {listingSugs.length > 0 && <>
          <p className="search-section">Title matches:</p>
          <ul role="group">
            {listingSugs.map(renderSug)}
          </ul>
        </>}
        {searchSugs.length > 0 && <>
          <p className="search-section">Content matches:</p>
          <ul role="group">
            {searchSugs.map(renderSug)}
          </ul>
        </>}
      </div>

      <div
        className="absorb-input"
        role="none"
        onClick={() => setQuery("")}
      />
    </>}
  </search>
}
