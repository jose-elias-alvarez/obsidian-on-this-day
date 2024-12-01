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

    // https://help.obsidian.md/Files+and+folders/Accepted+file+formats
    private embeddedImageFileExtensions = new Set([
        "avif",
        "bmp",
        "gif",
        "jpeg",
        "jpg",
        "png",
        "svg",
        "webp",
    ]);
    private getPreviewImage(note: TFile): TFile | null {
        for (const embed of this.app.metadataCache.getFileCache(note)?.embeds ||
            []) {
            const embeddedFile = this.app.metadataCache.getFirstLinkpathDest(
                embed.link,
                note.path,
            );
            if (
                embeddedFile &&
                this.embeddedImageFileExtensions.has(embeddedFile.extension)
            )
                return embeddedFile;
        }
        return null;
    }

    private async createSection(note: TFile): Promise<void> {
        const sectionContainer = this.containerEl.createDiv();
        sectionContainer.classList.add("on-this-day-section");

        const contentContainer = sectionContainer.createDiv();
        contentContainer.classList.add("on-this-day-section-content");

        const sectionHeading = contentContainer.createEl("h4");
        const headingLink = sectionHeading.createEl("a");
        headingLink.setText(note.basename);
        headingLink.setAttr("href", note.basename);
        headingLink.addEventListener("click", (e) => {
            e.preventDefault();
            this.app.workspace.openLinkText(note.basename, note.path);
        });

        const preview = contentContainer.createEl("blockquote");
        await MarkdownRenderer.render(
            this.app,
            await this.app.vault.cachedRead(note),
            preview,
            note.path,
            this,
        );
        preview
            .querySelectorAll(".internal-link")
            .forEach((link: HTMLElement) => {
                link.addEventListener("click", (event) => {
                    event.preventDefault();
                    this.app.workspace.openLinkText(
                        link.getAttribute("href") || "",
                        note.path,
                        event.ctrlKey || event.metaKey,
                    );
                });
            });

        const previewImage = this.getPreviewImage(note);
        if (previewImage) {
            const imageContainer = sectionContainer.createDiv();
            imageContainer.classList.add("on-this-day-section-image-container");
            imageContainer.createEl("img").src =
                this.app.vault.getResourcePath(previewImage);
        }
    }

    async refresh(): Promise<void> {
        this.containerEl.empty();
        this.containerEl.addClass("on-this-day");
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
