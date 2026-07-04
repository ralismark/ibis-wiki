import "./WidgetCard.css"
import { useEffect, useRef } from "react"
import { assertUnreachable } from "../util"
import { CalendarWidget } from "./CalendarWidget"
import { ConfigWidget } from "./ConfigWidget"
import { FileWidget, TodayWidget } from "./FileWidget"
import { GraphWidget } from "./GraphWidget"
import type { WidgetControl } from "./Widget"

export type Widget = CalendarWidget | ConfigWidget | TodayWidget | FileWidget | GraphWidget

export function widgetToRepr(w: Widget): string {
	if (w instanceof CalendarWidget) return "~calendar"
	else if (w instanceof ConfigWidget) return "~config"
	else if (w instanceof TodayWidget) return "~today"
	else if (w instanceof FileWidget) return ":" + w.path
	else if (w instanceof GraphWidget) return "~graph"
	else assertUnreachable(w)
}

export function reprToWidget(s: string): Widget | null {
	if (s === "~calendar") return new CalendarWidget()
	else if (s === "~config") return new ConfigWidget()
	else if (s === "~today") return new TodayWidget()
	else if (s.startsWith(":")) return new FileWidget(s.substring(1))
	else if (s === "~graph") return new GraphWidget()
	else return null
}

export function WidgetCard(props: { widget: Widget; ctl: WidgetControl; focusHook: any }) {
	const contents = props.widget.show(props.ctl)
	const elem = useRef<HTMLElement>(null)

	useEffect(() => {
		elem.current?.scrollIntoView({
			behavior: "smooth",
			block: "start",
			inline: "center",
		})
		;(document.activeElement as HTMLElement | undefined)?.blur()
	}, [elem, props.focusHook])

	contents.controls.unshift(
		["×", () => props.ctl.closeSelf()],
		["←", () => props.ctl.moveLeft()],
		["→", () => props.ctl.moveRight()],
	)

	return (
		<article className={"WidgetCard " + contents.className} ref={elem}>
			<h1>
				{contents.title}
				<menu>
					{contents.controls.map(([label, fn], idx) => (
						<li key={idx}>
							<button onClick={fn}>{label}</button>
						</li>
					))}
				</menu>
			</h1>

			{contents.body}
		</article>
	)
}
