import { App, PluginSettingTab, Setting } from "obsidian";
import OnThisDayPlugin from "./main";

export default class OnThisDayPluginSettingTab extends PluginSettingTab {
    plugin: OnThisDayPlugin;

    constructor(app: App, plugin: OnThisDayPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        this.containerEl.empty();

        new Setting(this.containerEl)
            .setName("Show image preview")
            .setDesc(
                "If a note contains an embedded image, include it in its preview.",
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showImagePreview)
                    .onChange(async (value) => {
                        this.plugin.settings.showImagePreview = value;
                        await this.plugin.saveSettings();
                        this.plugin.refreshViews();
                    }),
            );
    }
}
