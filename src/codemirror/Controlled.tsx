import { EditorState, Transaction, type TransactionSpec } from "@codemirror/state"
import { EditorView, ViewPlugin } from "@codemirror/view"
import { type JSX, type ReactNode, type RefObject, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Feed } from "../extern"

/*
 * EditorStateRef wraps a CodeMirror EditorState to allow it to be "shared",
 * rather than being owned by a particular editor view.
 */
export class EditorStateRef {
	private state: EditorState
	private feed: Feed<[Transaction /*| EditorState*/]> = new Feed()

	constructor(state: EditorState) {
		this.state = state
	}

	subscribe(f: (tr: Transaction /*| EditorState*/) => void): () => void {
		return this.feed.subscribe(f)
	}

	// Get the current EditorState. If this is called during a callback, the
	// state is the new state.
	getState(): EditorState {
		return this.state
	}

	update(tr: Transaction): Transaction
	update(...specs: TransactionSpec[]): Transaction
	update(...input: TransactionSpec[] | [Transaction]): Transaction {
		const tr = input.length === 1 && input[0] instanceof Transaction
			? input[0]
			: this.state.update(...(input as TransactionSpec[]))

		this.state = tr.state
		this.feed.signal(tr)
		return tr
	}

	static use(
		self: EditorStateRef | undefined,
		parent: RefObject<HTMLElement | null>,
		deps: any[],
	): JSX.Element {
		const [reactChildren, setReactChildren] = useState<Map<number, [ReactNode, HTMLElement]>>(new Map())

		useEffect(() => {
			if (!self || !parent.current) return

			const view = new EditorView({
				parent: parent.current,
				state: self.state,
				extensions: [],
				dispatch: tr => self.update(tr),
			})
			const unsub = self.subscribe(tr => view.update([tr]))

			view.plugin(reactPortal)!.setOutlet((children: ReactNode, domNode: HTMLElement) => {
				const key = autoincrement++
				setReactChildren(c => {
					c = new Map(c)
					c.set(key, [children, domNode])
					return c
				})
				return () =>
					setReactChildren(c => {
						c = new Map(c)
						c.delete(key)
						return c
					})
			})

			return () => {
				unsub()
				view.destroy()
			}
		}, [...deps, parent])

		return (
			<>
				{Array.from(reactChildren, ([key, [children, domNode]]) => createPortal(children, domNode, key))}
			</>
		)
	}
}

let autoincrement = 0

type Portaller = (children: ReactNode, domNode: HTMLElement) => () => void

export const reactPortal = ViewPlugin.fromClass(
	class {
		setOutlet: (fn: Portaller) => void
		outlet: Promise<Portaller>

		constructor() {
			this.setOutlet = () => {}
			this.outlet = new Promise(resolve => {
				this.setOutlet = resolve
			})
		}

		portal(children: ReactNode, domNode: HTMLElement): () => void {
			const p = this.outlet.then(fn => fn(children, domNode))
			return async () => (await p)()
		}
	},
)
