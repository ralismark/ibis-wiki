import { IbisConfig } from "../config"
import { ConfigWidget } from "./ConfigWidget"
import { FileWidget, TodayWidget } from "./FileWidget"
import { CalendarWidget } from "./CalendarWidget"
import { GraphWidget } from "./GraphWidget"
import { assertUnreachable } from "../util"

export interface SiteControl {
  open(newWidget: Widget): void
  updateConfig(config: IbisConfig): void
}

export const DummySiteControl: SiteControl = {
  open() {},
  updateConfig() {},
}

export interface WidgetControl extends SiteControl {
  closeSelf(): void
}

export interface IWidget {
  className(): string
  show(ctl: WidgetControl): [JSX.Element, JSX.Element]
}

export type Widget =
  | CalendarWidget
  | ConfigWidget
  | TodayWidget
  | FileWidget
  | GraphWidget

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
