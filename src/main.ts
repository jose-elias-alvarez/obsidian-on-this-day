import moment from "moment";
import { debounce, IconName, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import OnThisDaySidePanelView from "./side-panel-view";

type OnThisDayLeaf = WorkspaceLeaf & {
    view: OnThisDaySidePanelView;
};

type Listener = (notes: TFile[], formattedDate: string) => void;

export default class OnThisDayPlugin extends Plugin {
    static title = "On This Day";
    static icon: IconName = "notebook-pen";
    static viewType = "on-this-day-view";
    static commandId = "open-on-this-day-panel";
    static commandName = "Open panel";
    private static defaultFormat = "YYYY-MM-DD";

    private listeners: Listener[] = [];
    subscribe(listener: Listener) {
        this.listeners.push(listener);
    }
    unsubscribe(listener: Listener) {
        this.listeners.remove(listener);
    }
    emit(notes: TFile[], formattedDate: string) {
        this.listeners.forEach((listener) => listener(notes, formattedDate));
    }

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

    private get currentDate(): moment.Moment {
        const currentNote = this.app.workspace.getActiveFile();
        return currentNote && this.isDailyNote(currentNote)
            ? moment(currentNote.basename, this.format)
            : moment();
    }

    get formattedDate() {
        return this.currentDate.format(this.format);
    }

    private isDailyNote(note: TFile): boolean {
        return (
            note.path.startsWith(this.folder) && moment(note.basename).isValid()
        );
    }

    notes: TFile[] = [];
    private getDailyNotes(): TFile[] {
        const { currentDate, format } = this;
        const dailyNotes = this.app.vault
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
        this.notes = dailyNotes;
        return dailyNotes;
    }

    private get visibleLeaves(): OnThisDayLeaf[] {
        return this.app.workspace
            .getLeavesOfType(OnThisDayPlugin.viewType)
            .filter((leaf) => !leaf.isDeferred) as OnThisDayLeaf[];
    }

    private async activateView() {
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

    private refreshViews(reload = false) {
        this.emit(
            reload ? this.getDailyNotes() : this.notes,
            this.formattedDate,
        );
    }

    private onFileChange(note: TFile | null) {
        if (!(note && this.isDailyNote(note))) return;
        this.refreshViews(true);
    }

    private onContentChange(note: TFile) {
        if (this.visibleLeaves.length === 0) return;
        if (!this.isDailyNote(note)) return;
        this.refreshViews();
    }

    async onload() {
        this.registerView(
            OnThisDayPlugin.viewType,
            (leaf) => new OnThisDaySidePanelView(leaf, this),
        );

        this.registerEvent(
            this.app.workspace.on("file-open", (note) =>
                this.onFileChange(note),
            ),
        );
        this.registerEvent(
            this.app.metadataCache.on("deleted", (note) =>
                this.onFileChange(note),
            ),
        );
        this.registerEvent(
            this.app.metadataCache.on(
                "changed",
                debounce((note) => this.onContentChange(note)),
                1000,
            ),
        );
        this.app.workspace.onLayoutReady(() => this.refreshViews(true));

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
