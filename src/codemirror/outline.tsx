import { syntaxTree } from "@codemirror/language"
import type { EditorState, Extension } from "@codemirror/state"
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view"
import { type SyntaxNodeRef, Tree } from "@lezer/common"
import { type JSX, type ReactNode } from "react"
import { type Extern, ExternState, Feed, useExtern } from "../extern"
import { reactPortal } from "./Controlled"

// TODO this is work in progress...

function outline(state: EditorState) {
	const headings: ReactNode[] = []

	syntaxTree(state).iterate({
		enter(node) {
			if (node.name.startsWith("ATXHeading")) {
				const content = state.sliceDoc(node.from, node.to)
				headings.push(
					<li key={content}>{node.name} -- {content}</li>,
				)
			}
		},
	})

	return (
		<div>
			{headings}
		</div>
	)
}

function ExternComponent(props: { extern: Extern<ReactNode> }) {
	return useExtern(props.extern)
}

export const markdownOutline: Extension = ViewPlugin.define((view: EditorView) => {
	const content = new ExternState<ReactNode>(outline(view.state))

	let destroy = view.plugin(reactPortal)!.portal!(
		<ExternComponent extern={content} />,
		view.dom,
	)

	return {
		update(view: ViewUpdate) {
			content.set(outline(view.state))
		},
		destroy,
	}
})
