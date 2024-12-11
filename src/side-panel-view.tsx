import { IconName, ItemView, TFile, WorkspaceLeaf } from "obsidian";
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import removeMd from "remove-markdown";
import OnThisDayPlugin from "./main";

export default class OnThisDaySidePanelView extends ItemView {
    plugin: OnThisDayPlugin;
    root: Root | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: OnThisDayPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    private toPlainText(markdown: string) {
        return removeMd(markdown)
            .replace(/!\[\[.*?\]\]/g, "") // embeds
            .replace(/\[\[.*?\|(.*?)\]\]/g, "$1") // aliased wikilinks
            .replace(/\[\[(.*?)\]\]/g, "$1"); // normal wikilinks
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
    private getImagePreview(note: TFile) {
        if (!this.plugin.settings.showImagePreview) return;

        for (const embed of this.app.metadataCache.getFileCache(note)?.embeds ||
            []) {
            const file = this.app.metadataCache.getFirstLinkpathDest(
                embed.link,
                note.path,
            );
            if (file && this.embeddedImageFileExtensions.has(file.extension)) {
                return file;
            }
        }
    }

    Section = ({ note, isCurrent }: { note: TFile; isCurrent: boolean }) => {
        const [textPreview, setTextPreview] = useState("");
        useEffect(() => {
            (async () => {
                const markdown = await this.app.vault.cachedRead(note);
                setTextPreview(this.toPlainText(markdown));
            })();
        }, [note.stat.mtime]);

        const imagePreview = useMemo(
            () => this.getImagePreview(note),
            [note.stat.mtime, this.plugin.settings.showImagePreview],
        );

        return (
            <div
                className={`on-this-day-section ${isCurrent ? "current" : ""}`}
                onClick={() =>
                    this.app.workspace.openLinkText(note.basename, note.path)
                }
            >
                <div className="on-this-day-section-content">
                    <h4>{note.basename}</h4>
                    <blockquote>{textPreview}</blockquote>
                </div>
                {imagePreview && (
                    <div className="on-this-day-section-image-container">
                        <img
                            src={this.app.vault.getResourcePath(imagePreview)}
                        />
                    </div>
                )}
            </div>
        );
    };

    RootComponent = () => {
        const [notes, setNotes] = useState<TFile[]>(this.plugin.notes);
        const [date, setDate] = useState<string>(this.plugin.formattedDate);
        useEffect(() => {
            const listener = (newNotes: TFile[], newDate: string) => {
                setNotes([...newNotes]);
                setDate(newDate);
            };
            this.plugin.subscribe(listener);
            return () => this.plugin.unsubscribe(listener);
        }, []);
        return (
            <>
                <h3>
                    {OnThisDayPlugin.title}: {date}
                </h3>
                {notes.map((note) => (
                    <this.Section
                        key={note.path}
                        note={note}
                        isCurrent={note.basename === date}
                    />
                ))}
            </>
        );
    };

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
        this.root = createRoot(this.containerEl.children[1]);
        this.root?.render(
            <StrictMode>
                <this.RootComponent />
            </StrictMode>,
        );
    }

    async onClose(): Promise<void> {
        this.root?.unmount();
        this.root = null;
    }
}
