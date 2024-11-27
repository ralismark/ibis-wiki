import { IbisConfig } from "../config"
import { ConfigWidget } from "./ConfigWidget"
import { FileWidget, TodayWidget } from "./FileWidget"
import { CalendarWidget } from "./CalendarWidget"
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
  show(ctl: WidgetControl): [JSX.Element, JSX.Element]
}

export type Widget =
  | CalendarWidget
  | ConfigWidget
  | FileWidget
  | TodayWidget

export function widgetTypename(w: Widget) {
  if (w instanceof CalendarWidget) return "CalendarWidget"
  else if (w instanceof ConfigWidget) return "ConfigWidget"
  else if (w instanceof TodayWidget) return "TodayWidget"
  else if (w instanceof FileWidget) return "FileWidget"
  else assertUnreachable(w)
}

export function widgetToString(w: Widget): string {
  if (w instanceof CalendarWidget) return "~calendar"
  else if (w instanceof ConfigWidget) return "~config"
  else if (w instanceof TodayWidget) return "~today"
  else if (w instanceof FileWidget) return ":" + w.path
  else assertUnreachable(w)
}

export function stringToWidget(s: string): Widget | null {
  if (s === "~calendar") return new CalendarWidget()
  else if (s === "~config") return new ConfigWidget()
  else if (s === "~today") return new TodayWidget()
  else if (s.startsWith(":")) return new FileWidget(s.substring(1))
  else return null
}
