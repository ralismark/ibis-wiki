import "./IbisSearch.css"
import { Fragment, type JSX, useEffect, useId, useMemo, useRef, useState } from "react"
import { Facade } from "../backend"
import { NumDirty, NumSyncing } from "../backend/file"
import { useExtern } from "../extern"
import { CalendarWidget } from "./CalendarWidget"
import { ConfigWidget } from "./ConfigWidget"
import { FileWidget, TodayWidget } from "./FileWidget"
import { GraphWidget } from "./GraphWidget"
import { type SiteControl } from "./Widget"

type Suggestion = {
	key: string
	content: JSX.Element
	activate: () => void
}

// only using this to scroll the option into view when selected
function Option({
	suggestion,
	selected,
	...props
}: {
	suggestion: Suggestion
	selected: boolean
} & React.LiHTMLAttributes<HTMLLIElement>) {
	const ref = useRef<HTMLLIElement | null>(null)

	useEffect(() => {
		if (selected) {
			ref.current?.scrollIntoView({
				block: "nearest",
			})
		}
	}, [ref, selected])

	return (
		<li ref={ref} {...props}>
			{suggestion.content}
		</li>
	)
}

function getSuggestions(
	query: string,
	ctl: SiteControl,
	facade: Facade,
): [string, (inner: any) => JSX.Element, Suggestion[]][] {
	const out: [string, (inner: any) => JSX.Element, Suggestion[]][] = []

	const resultsContainer = (name: string) => (children: any) => (
		<>
			<p className="search-section">{name}</p>
			<ul role="group">{children}</ul>
		</>
	)

	// general entries
	if (query !== "") {
		out.push([
			"top",
			(x) => <ul role="group">{x}</ul>,
			[
				{
					key: "general/open",
					content: <>Open note "{query}"</>,
					activate: () => ctl.open(new FileWidget(query)),
				},
			],
		])
	}

	// filename matches
	const listingSugs: Suggestion[] = useMemo(() => {
		// impure, since we don't want to recalculate the search suggestions
		// whenever the listings change
		const listing = facade.listing.getSnapshot()
		if (!listing) return []

		const parts = query
			.toLowerCase()
			.split(/\s+/)
			.filter((x) => x !== "")
		if (parts.length === 0) return []
		return Array.from(listing)
			.filter((path) => parts.every((part) => path.toLowerCase().includes(part)))
			.map((path) => ({
				key: "card-title/" + path,
				content: <>{path}</>,
				activate: () => ctl.open(new FileWidget(path)),
			}))
	}, [ctl, facade, query])
	out.push(["card-title", resultsContainer("Title matches:"), listingSugs])

	// full-text search
	const [searchSugs, setSearchSugs] = useState<Suggestion[]>([]) // since it's async
	useEffect(() => {
		facade.fts.search(query).then((results) => {
			setSearchSugs(
				results.map((path) => ({
					key: "search/" + path,
					content: <>{path}</>,
					activate: () => ctl.open(new FileWidget(path)),
				})),
			)
		})
	}, [ctl, facade, query])
	out.push(["search", resultsContainer("Content matches:"), searchSugs])

	// special cards
	out.push([
		"special",
		(x) => <menu>{x}</menu>,
		[
			{
				key: "special/today",
				content: <>☀️ Today</>,
				activate: () => ctl.open(new TodayWidget()),
			},
			{
				key: "special/calendar",
				content: <>🗓️ Calendar</>,
				activate: () => ctl.open(new CalendarWidget()),
			},
			{
				key: "special/graph",
				content: <>🗺️ Graph</>,
				activate: () => ctl.open(new GraphWidget()),
			},
			{
				key: "special/config",
				content: <>🔧 Config</>,
				activate: () => ctl.open(new ConfigWidget()),
			},
		],
	])

	return out
}

export function IbisSearch(props: { ctl: SiteControl; facade: Facade }) {
	const { ctl, facade } = props
	const [queryOrig, setQuery] = useState("")
	const query = queryOrig.trim()
	const [selected, setSelected] = useState("")

	const dialogRef = useRef<HTMLDialogElement>(null)

	// reset selection when search cleared
	useEffect(() => {
		if (query === "") setSelected("")
	}, [query])

	const contents = getSuggestions(query, ctl, facade)
	const allSugs = contents.flatMap(([_key, _header, sugs]) => sugs)

	const getNextPrev = (): [string, string] => {
		const idx = allSugs.findIndex(({ key }) => key === selected)
		const first = allSugs[0]?.key || ""
		if (idx === -1) return [first, first]
		return [
			allSugs[idx - 1]?.key || allSugs[allSugs.length - 1]?.key || first,
			allSugs[idx + 1]?.key || first,
		]
	}

	const acceptSelected = () => {
		const match = allSugs.find(({ key }) => key === selected)
		console.log(match)
		if (match) {
			match.activate()
			dialogRef.current?.close()
		}
	}

	// UI -----------------------------------------------------------------------

	const resultsId = useId()
	const activeId = useId()

	const dirty = useExtern(NumDirty)
	const syncing = useExtern(NumSyncing)

	return (
		<>
			<div
				className="PaletteButton"
				data-dirty={dirty}
				data-syncing={syncing}
				title={`${dirty} dirty ${syncing} syncing`}
			>
				<button onClick={() => dialogRef.current?.showModal()} aria-keyshortcuts="Control+k">
					C-K
				</button>
			</div>

			<dialog
				ref={dialogRef}
				className="Palette"
				onMouseDown={(e) => {
					// ugh... closedby="any" isn't baseline
					if (e.target === e.currentTarget) {
						e.stopPropagation()
						e.currentTarget.close()
					}
				}}
				onClose={() => setQuery("")}
			>
				<input
					type="search"
					value={queryOrig}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							setQuery("")
							e.currentTarget.blur()
						} else if (e.key === "ArrowUp") {
							e.preventDefault()
							setSelected(getNextPrev()[0])
						} else if (e.key === "ArrowDown") {
							e.preventDefault()
							setSelected(getNextPrev()[1])
						} else if (e.key === "Enter") acceptSelected()
						// else console.log(e.code)
					}}
					placeholder="Search"
					role="combobox"
					aria-label="Search"
					aria-expanded={query !== ""}
					aria-controls={resultsId}
				/>

				<div id={resultsId} role="listbox" aria-activedescendant={activeId}>
					{contents.map(
						([key, wrapper, sugs]) =>
							sugs.length > 0 && (
								<Fragment key={key}>
									{wrapper(
										sugs.map((s) => (
											<Option
												key={s.key}
												suggestion={s}
												selected={s.key === selected}
												role="option"
												tabIndex={0}
												onClick={(e) => {
													e.preventDefault()
													s.activate()
													dialogRef.current?.close()
												}}
												onFocus={() => setSelected(s.key)}
												onMouseOver={() => setSelected(s.key)}
												aria-selected={s.key === selected}
												id={s.key === selected ? activeId : undefined}
											/>
										)),
									)}
								</Fragment>
							),
					)}
				</div>
			</dialog>
		</>
	)
}
