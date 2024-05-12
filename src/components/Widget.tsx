import { toast } from "react-toastify"
import { IbisConfig } from "../config"
import { ConfigWidget } from "./ConfigWidget"
import { FileWidget } from "./FileWidget"

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

export interface Widget {
  typename(): string
  show(ctl: WidgetControl): [JSX.Element, JSX.Element]
}

// Get a string that fully represents the contents of the widget
export function widgetToString(w: Widget) {
  return w.typename() + ":" + JSON.stringify(w)
}
