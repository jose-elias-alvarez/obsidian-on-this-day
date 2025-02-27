import {
    IconName,
    ItemView,
    MarkdownRenderer,
    TFile,
    WorkspaceLeaf,
} from "obsidian";
import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import OnThisDayPlugin from "./main";

export default class OnThisDaySidePanelView extends ItemView {
    plugin: OnThisDayPlugin;
    root: Root | null = null;
    renderId: number;

    constructor(leaf: WorkspaceLeaf, plugin: OnThisDayPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.renderId = 0;
    }

    private async getContent(note: TFile) {
        const content = await this.app.vault.cachedRead(note);
        return (
            content
                // remove yaml metadata
                // MarkdownRenderer.render is really weird: it only seems to show up on double renders,
                // so just remove it to maintain consistency in case of bugs
                .replace(/^---\n[\s\S]*?\n---\n?/, "")
                // special case: remove top-level heading that matches note title
                .replace(/^#\s+.*(\n|$)/, (match) =>
                    match.trim() === `# ${note.basename}` ? "" : match,
                )
        );
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
        const previewRef = useRef<HTMLDivElement>(null);
        const renderIdRef = useRef(0);
        useEffect(() => {
            if (!previewRef.current) return;
            const renderId = ++renderIdRef.current;
            (async () => {
                if (!previewRef.current) return;
                const content = await this.getContent(note);
                // MarkdownRenderer.render *appends* content, so check before continuing to avoid race condition
                if (renderId !== renderIdRef.current) return;
                previewRef.current.innerHTML = "";
                await MarkdownRenderer.render(
                    this.app,
                    content,
                    previewRef.current,
                    "",
                    this,
                );
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
                    <div
                        className="on-this-day-section-preview"
                        ref={previewRef}
                    />
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
