import { WidgetControl, IWidget } from "./Widget"
import { Config } from "../config"

export class ConfigWidget implements IWidget {
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
}
