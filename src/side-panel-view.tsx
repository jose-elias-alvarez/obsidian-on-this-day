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
    private getImagePreview(note: TFile) {
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

    Section = ({ note }: { note: TFile }) => {
        const textPreviewRef = useRef<HTMLQuoteElement | null>(null);
        useEffect(() => {
            const renderMarkdown = async () => {
                if (!textPreviewRef.current) return;
                const content = await this.app.vault.cachedRead(note);
                const hash = `${content.length}:${content.slice(0, 50)}`;
                if (textPreviewRef.current.dataset.hash === hash) {
                    return;
                }
                textPreviewRef.current.setText("");
                await MarkdownRenderer.render(
                    this.app,
                    content,
                    textPreviewRef.current,
                    note.path,
                    this,
                );
                textPreviewRef.current.dataset.hash = hash;
            };
            renderMarkdown();
        }, [note.stat.mtime]);

        const imagePreview = useMemo(
            () => this.getImagePreview(note),
            [note.stat.mtime],
        );

        return (
            <div
                className="on-this-day-section"
                onClick={() =>
                    this.app.workspace.openLinkText(note.basename, note.path)
                }
            >
                <div className="on-this-day-section-content">
                    <h4>{note.basename}</h4>
                    <blockquote ref={textPreviewRef} />
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
        const [notes, setNotes] = useState<TFile[]>([]);
        const [date, setDate] = useState<string>("");
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
                <h3>On This Day: {date}</h3>
                {notes.map((note) => (
                    <this.Section key={note.path} note={note} />
                ))}
            </>
        );
    };

    async render(): Promise<void> {
        this.root?.render(
            <StrictMode>
                <this.RootComponent />
            </StrictMode>,
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
        this.root = createRoot(this.containerEl.children[1]);
        this.render();
    }

    async onClose(): Promise<void> {
        this.root?.unmount();
    }
}
