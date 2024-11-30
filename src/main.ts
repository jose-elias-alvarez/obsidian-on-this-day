import moment from "moment";
import { App, IconName, Plugin, PluginManifest, TFile } from "obsidian";
import OnThisDaySidePanelView from "./side-panel-view";

export default class OnThisDayPlugin extends Plugin {
    static title = "On This Day";
    static icon: IconName = "notebook-pen";
    static viewType = "on-this-day-view";
    static commandId = "open-on-this-day-panel";
    static commandName = "Open On This Day panel";

    dailyNotesFolder: string;
    dailyNotesFormat: string;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        const { folder, format } =
            // @ts-expect-error
            this.app.internalPlugins.getPluginById("daily-notes")?.instance
                ?.options || {};
        this.dailyNotesFolder = folder || "";
        this.dailyNotesFormat = format || "YYYY-MM-DD";
    }

    private isDailyNote(note: TFile): boolean {
        return (
            note.path.startsWith(this.dailyNotesFolder) &&
            moment(note.basename).isValid()
        );
    }

    getCurrentDate(): moment.Moment {
        const currentNote = this.app.workspace.getActiveFile();
        return currentNote && this.isDailyNote(currentNote)
            ? moment(currentNote.basename, this.dailyNotesFormat)
            : moment();
    }

    async getOnThisDayNotes(): Promise<{ name: string; content: string }[]> {
        const currentDate = this.getCurrentDate();
        const dailyNotes = this.app.vault
            .getFiles()
            .filter((note) => this.isDailyNote(note))
            .map((note) => ({
                note,
                date: moment(note.basename, this.dailyNotesFormat),
            }))
            .filter(({ date }) => {
                return (
                    date.date() === currentDate.date() &&
                    date.month() === currentDate.month()
                );
            })
            .sort((a, b) => b.date.valueOf() - a.date.valueOf())
            .map(({ note }) => note);
        return Promise.all(
            dailyNotes.map(async (note) => ({
                name: note.basename,
                content: await this.app.vault.cachedRead(note),
            })),
        );
    }

    async activateView(): Promise<void> {
        const leaf = this.app.workspace.getRightLeaf(false);
        if (!leaf) return;
        await leaf.setViewState({
            type: OnThisDayPlugin.viewType,
            active: true,
        });
        this.app.workspace.revealLeaf(leaf);
    }

    async refresh(): Promise<void> {
        const onThisDayViews = this.app.workspace
            .getLeavesOfType(OnThisDayPlugin.viewType)
            .filter((leaf) => leaf.view instanceof OnThisDaySidePanelView)
            .map((leaf) => leaf.view) as OnThisDaySidePanelView[];
        await Promise.all(
            onThisDayViews.map(async (view) => {
                await view.refresh();
            }),
        );
    }

    async onload(): Promise<void> {
        this.registerView(
            OnThisDayPlugin.viewType,
            (leaf) => new OnThisDaySidePanelView(leaf, this),
        );
        this.registerEvent(
            this.app.workspace.on("file-open", async (note) => {
                if (!(note && this.isDailyNote(note))) return;
                this.refresh();
            }),
        );
        this.registerEvent(
            this.app.metadataCache.on("changed", async (note: TFile) => {
                if (!this.isDailyNote(note)) return;
                await this.refresh();
            }),
        );
        this.addCommand({
            id: OnThisDayPlugin.commandId,
            name: OnThisDayPlugin.commandName,
            callback: async () => {
                await this.activateView();
            },
        });
        this.addRibbonIcon(
            OnThisDayPlugin.icon,
            OnThisDayPlugin.commandName,
            async () => {
                await this.activateView();
            },
        );
    }
}
