import { Config } from "../config"
import { type IWidget, WidgetContent, type WidgetControl } from "./Widget"

export class ConfigWidget implements IWidget {
	show(ctl: WidgetControl): WidgetContent {
		return new WidgetContent("ConfigWidget").withTitle("~ Config ~").withBody(
			<section>
				<Config onChange={(cfg) => ctl.updateConfig(cfg)} />
			</section>,
		)
	}
}
