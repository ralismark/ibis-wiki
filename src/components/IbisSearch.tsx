import "./IbisSearch.css"
import { useEffect, useId, useMemo, useRef, useState, Fragment } from "react"
import { Facade, FacadeExtern } from "../backend"
import { IbisController } from "../App"
import { useExtern } from "../extern"
import { FileWidget } from "./FileWidget"
import { SiteControl } from "./Widget"

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

function getSuggestions(
  query: string,
  ctl: SiteControl,
  facade: Facade,
): [string, JSX.Element, Suggestion[]][] {
  const out: [string, JSX.Element, Suggestion[]][] = []

  // general entries
  if (query !== "") {
    out.push([
      "top",
      <></>,
      [
        {
          key: "", // empty string to auto-select by default
          content: <>Open note "{query}"</>,
          fn: () => ctl.open(new FileWidget(query)),
        }
      ],
    ])
  }

  // filename matches
  const listingSugs: Suggestion[] = useMemo(() => {
    // impure, since we don't want to recalculate the search suggestions
    // whenever the listings change
    const listing = facade.listing.getSnapshot()
    if (!listing) return []

    const parts = query.toLowerCase().split(/\s+/).filter(x => x !== "")
    if (parts.length === 0) return []
    return Array.from(listing)
        .filter(path => parts.every(part => path.toLowerCase().includes(part)))
        .map(path => ({
          key: "card-title/" + path,
          content: <>{path}</>,
          fn: () => ctl.open(new FileWidget(path)),
        }))
  }, [ctl, facade, query])
  out.push([
    "card-title",
    <p className="search-section">Title matches:</p>,
    listingSugs,
  ])

  // full-text search
  const [searchSugs, setSearchSugs] = useState<Suggestion[]>([]) // since it's async
  useEffect(() => {
    facade.fts.search(query).then(results => {
      setSearchSugs(results.map(path => ({
        key: "search/" + path,
        content: <>{path}</>,
        fn: () => ctl.open(new FileWidget(path)),
      })))
    })
  }, [ctl, facade, query])

  out.push([
    "search",
    <p className="search-section">Content matches:</p>,
    searchSugs,
  ])

  return out
}

export function IbisSearch(props: { ctl: SiteControl, facade: Facade }) {
  const { ctl, facade } = props
  const [queryOrig, setQuery] = useState("")
  const query = queryOrig.trim()
  const [selected, setSelected] = useState("")

  // reset selection when search cleared
  useEffect(() => {
    if (query === "") setSelected("")
  }, [query])

  const contents = getSuggestions(query, ctl, facade)
  const allSugs = contents.flatMap(([key, header, sugs]) => sugs)

  const getNextPrev = (): [string, string] => {
    const idx = allSugs.findIndex(({key}) => key === selected)
    if (idx === -1) return ["", ""]
    return [
      allSugs[idx-1]?.key || allSugs[allSugs.length - 1]?.key || "",
      allSugs[idx+1]?.key || "",
    ]
  }

  const acceptSelected = () => {
    const match = allSugs.find(({key}) => key === selected)
    if (match) {
      match.fn()
      setQuery("")
    }
  }

  // UI -----------------------------------------------------------------------

  const resultsId = useId()
  const activeId = useId()

  return <search className="ibis-search">
    <input
      type="search"
      value={queryOrig}
      onChange={e => setQuery(e.target.value)}
      onKeyDown={e => {
        if (e.code === "Escape") {
          setQuery("")
          e.currentTarget.blur()
        } else if (e.code === "ArrowUp") setSelected(getNextPrev()[0])
        else if (e.code === "ArrowDown") setSelected(getNextPrev()[1])
        else if (e.code === "Enter") acceptSelected()
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
        {contents.map(([key, header, sugs]) => sugs.length > 0 && <Fragment key={key}>
          {header}
          <ul role="group">
            {sugs.map(s => <Option
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
            />)}
          </ul>
        </Fragment>)}
      </div>

      <div
        className="absorb-input"
        role="none"
        onClick={() => setQuery("")}
      />
    </>}
  </search>
}
