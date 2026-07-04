import { type JSX } from "react"
import { type IbisConfig } from "../config"

export interface SiteControl {
	open(newWidget: IWidget): void
	updateConfig(config: IbisConfig): void
}

export const DummySiteControl: SiteControl = {
	open() {},
	updateConfig() {},
}

export interface WidgetControl extends SiteControl {
	closeSelf(): void
	moveLeft(): void
	moveRight(): void
}

export abstract class IWidget {
	static nextId: number = 1
	readonly id: number

	constructor() {
		this.id = IWidget.nextId++
	}

	abstract show(ctl: WidgetControl): WidgetContent
}

export class WidgetContent {
	className: string
	title: JSX.Element = <></>
	controls: Array<[string, () => void]> = []
	body: JSX.Element = <></>

	constructor(className: string) {
		this.className = className
	}

	withTitle(title: JSX.Element): this {
		this.title = title
		return this
	}

	withControl(label: string, fn: () => void): this {
		this.controls.push([label, fn])
		return this
	}

	withBody(body: JSX.Element): this {
		this.body = body
		return this
	}
}
