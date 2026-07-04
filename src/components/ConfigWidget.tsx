import { WidgetControl, IWidget, WidgetContent } from "./Widget"
import { Config } from "../config"

export class ConfigWidget implements IWidget {
  show(ctl: WidgetControl): WidgetContent {
    return new WidgetContent("ConfigWidget")
      .withTitle("~ Config ~")
      .withBody(
        <section>
          <Config
            onChange={cfg => ctl.updateConfig(cfg)}
          />
        </section>
      )
  }
}
