import {
    IconName,
    ItemView,
    MarkdownRenderer,
    TFile,
    WorkspaceLeaf,
} from "obsidian";
import OnThisDayPlugin from "./main";

export default class OnThisDaySidePanelView extends ItemView {
    plugin: OnThisDayPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: OnThisDayPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    private async createSection(note: TFile): Promise<void> {
        const sectionHeading = this.containerEl.createEl("h4");
        sectionHeading
            .createEl("a", {
                text: note.basename,
                href: note.basename,
            })
            .addEventListener("click", (e) => {
                e.preventDefault();
                this.app.workspace.openLinkText(note.basename, note.path);
            });

        const preview = this.containerEl.createEl("blockquote");
        preview.addClass("on-this-day-preview");
        await MarkdownRenderer.render(
            this.app,
            (await this.app.vault.cachedRead(note)) || "(empty)",
            preview,
            note.path,
            this,
        );
        preview
            .querySelectorAll(".internal-link")
            .forEach((link: HTMLElement) =>
                link.addEventListener("click", (event) => {
                    event.preventDefault();
                    const href = link.getAttribute("href");
                    if (href) {
                        this.app.workspace.openLinkText(
                            href,
                            note.path,
                            event.ctrlKey || event.metaKey,
                        );
                    }
                }),
            );
    }

    async refresh(): Promise<void> {
        this.containerEl.empty();
        this.containerEl.addClass("on-this-day-container");
        this.containerEl.createEl("h3", {
            text: `${OnThisDayPlugin.title}: ${this.plugin.formattedDate}`,
        });
        if (this.plugin.notes.length === 0) {
            this.containerEl.createEl("p", { text: "No notes found!" });
            return;
        }
        await Promise.all(
            this.plugin.notes.map(
                async (note) => await this.createSection(note),
            ),
        );
    }

    getViewType(): string {
        return OnThisDayPlugin.viewType;
    }

    getDisplayText(): string {
        return OnThisDayPlugin.title;
    }

    getIcon(): IconName {
        return OnThisDayPlugin.icon;
    }

    async onOpen(): Promise<void> {
        await this.refresh();
    }
}
