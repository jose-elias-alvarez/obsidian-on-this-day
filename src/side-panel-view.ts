import { IconName, ItemView, MarkdownRenderer, WorkspaceLeaf } from "obsidian";
import OnThisDayPlugin from "./main";

export default class OnThisDaySidePanelView extends ItemView {
    maxLength = 200;
    plugin: OnThisDayPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: OnThisDayPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    private async createDailyNoteSection(
        name: string,
        content: string,
        sourcePath: string,
    ): Promise<void> {
        const heading = this.containerEl.createEl("h2");
        const headingLink = heading.createEl("a", {
            text: name,
            href: name,
        });
        headingLink.addEventListener("click", (e) => {
            e.preventDefault();
            this.app.workspace.openLinkText(name, sourcePath);
        });

        const previewEl = this.containerEl.createEl("blockquote");
        previewEl.addClass("on-this-day-preview");
        await MarkdownRenderer.render(
            this.app,
            content,
            previewEl,
            sourcePath,
            this,
        );
        previewEl
            .querySelectorAll(".internal-link")
            .forEach((link: HTMLElement) =>
                link.addEventListener("click", (event) => {
                    event.preventDefault();
                    const href = link.getAttribute("href");
                    if (href) {
                        this.app.workspace.openLinkText(
                            href,
                            sourcePath,
                            event.ctrlKey || event.metaKey,
                        );
                    }
                }),
            );
    }

    async refresh(): Promise<void> {
        this.containerEl.empty();
        this.containerEl.addClass("on-this-day-container");
        this.containerEl.createEl("h1", {
            text: OnThisDayPlugin.title,
        });

        const notes = await this.plugin.getOnThisDayNotes();
        await Promise.all(
            notes.map(
                async ({ name, content }) =>
                    await this.createDailyNoteSection(
                        name,
                        content || "(empty)",
                        this.app.workspace.getActiveFile()?.path || "",
                    ),
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
