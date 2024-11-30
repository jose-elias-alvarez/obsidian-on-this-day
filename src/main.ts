import moment from "moment";
import { IconName, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import OnThisDaySidePanelView from "./side-panel-view";

type OnThisDayLeaf = WorkspaceLeaf & {
    view: OnThisDaySidePanelView;
};

export default class OnThisDayPlugin extends Plugin {
    static title = "On This Day";
    static icon: IconName = "notebook-pen";
    static viewType = "on-this-day-view";
    static commandId = "open-on-this-day-panel";
    static commandName = "Open panel";
    private static defaultFormat = "YYYY-MM-DD";

    private get folder(): string {
        return (
            // @ts-expect-error
            this.app.internalPlugins.getPluginById("daily-notes")?.instance
                ?.options?.folder || ""
        );
    }
    private get format(): string {
        return (
            // @ts-expect-error
            this.app.internalPlugins.getPluginById("daily-notes")?.instance
                ?.options?.format || OnThisDayPlugin.defaultFormat
        );
    }

    private _notes: TFile[] | null = null;
    get notes(): TFile[] {
        if (!this._notes) {
            this.loadNotes();
        }
        return this._notes || [];
    }

    private loadNotes(): void {
        const { currentDate, format } = this;
        this._notes = this.app.vault
            .getFiles()
            .filter((note) => this.isDailyNote(note))
            .map((note) => ({
                note,
                date: moment(note.basename, format),
            }))
            .filter(({ date }) => {
                return (
                    date.date() === currentDate.date() &&
                    date.month() === currentDate.month()
                );
            })
            .sort((a, b) => b.date.valueOf() - a.date.valueOf())
            .map(({ note }) => note);
    }

    private get currentDate(): moment.Moment {
        const currentNote = this.app.workspace.getActiveFile();
        return currentNote && this.isDailyNote(currentNote)
            ? moment(currentNote.basename, this.format)
            : moment();
    }

    get formattedDate(): string {
        return this.currentDate.format(this.format);
    }

    private isDailyNote(note: TFile): boolean {
        return (
            note.path.startsWith(this.folder) && moment(note.basename).isValid()
        );
    }

    private get visibleLeaves(): OnThisDayLeaf[] {
        return this.app.workspace
            .getLeavesOfType(OnThisDayPlugin.viewType)
            .filter((leaf) => !leaf.isDeferred) as OnThisDayLeaf[];
    }

    private async activateView(): Promise<void> {
        const leaves = this.visibleLeaves;
        if (leaves.length > 0) {
            leaves.forEach((leaf) => this.app.workspace.revealLeaf(leaf));
            return;
        }

        const rightLeaf = this.app.workspace.getRightLeaf(false);
        if (!rightLeaf) return;
        await rightLeaf.setViewState({
            type: OnThisDayPlugin.viewType,
            active: true,
        });
        this.app.workspace.revealLeaf(rightLeaf);
    }

    private async refreshViews(reload = false): Promise<void> {
        if (reload) this.loadNotes();
        await Promise.all(
            this.visibleLeaves.map(async ({ view }) => await view.refresh()),
        );
    }

    private async onFileChange(note: TFile | null): Promise<void> {
        if (!(note && this.isDailyNote(note))) return;
        await this.refreshViews(true);
    }

    private async onContentChange(note: TFile): Promise<void> {
        if (this.visibleLeaves.length === 0) return;
        if (!this.isDailyNote(note)) return;
        await this.refreshViews();
    }

    async onload(): Promise<void> {
        this.registerView(
            OnThisDayPlugin.viewType,
            (leaf) => new OnThisDaySidePanelView(leaf, this),
        );
        this.registerEvent(
            this.app.workspace.on(
                "file-open",
                async (note) => await this.onFileChange(note),
            ),
        );
        this.registerEvent(
            this.app.metadataCache.on(
                "deleted",
                async (note) => await this.onFileChange(note),
            ),
        );

        this.registerEvent(
            this.app.metadataCache.on(
                "changed",
                async (note) => await this.onContentChange(note),
            ),
        );

        this.addCommand({
            id: OnThisDayPlugin.commandId,
            name: OnThisDayPlugin.commandName,
            callback: async () => await this.activateView(),
        });
        this.addRibbonIcon(
            OnThisDayPlugin.icon,
            OnThisDayPlugin.commandName,
            async () => await this.activateView(),
        );
    }
}
