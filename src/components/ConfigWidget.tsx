import { Config } from "../config"
import { IWidget, WidgetContent, type WidgetControl } from "./Widget"

export class ConfigWidget extends IWidget {
	show(ctl: WidgetControl): WidgetContent {
		return new WidgetContent("ConfigWidget")
			.withTitle(<em>~ Config ~</em>)
			.withBody(
				<section>
					<Config onChange={(cfg) => ctl.updateConfig(cfg)} />
				</section>,
			)
	}
}
