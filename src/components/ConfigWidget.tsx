import { WidgetControl, Widget } from "./Widget"
import { Config } from "../config"

export class ConfigWidget implements Widget {
  show(ctl: WidgetControl): [JSX.Element, JSX.Element] {
    return [
      <>~ Config ~</>,
      <>
        <section>
          <Config
            onChange={cfg => ctl.updateConfig(cfg)}
          />
        </section>
      </>,
    ]
  }

  typename(): string {
      return "ConfigWidget"
  }
}
