# On This Day

Show your daily notes from this day in a simple panel view. Inspired by [Day One](https://dayoneapp.com)'s On This Day feature.

![Screenshot 2024-12-11 at 4 53 49 PM](https://github.com/user-attachments/assets/2c7c88e4-e44e-4ebe-ad55-c1364b55825f)

## Usage

After installing, open the on this day panel using the `Open on this day panel` ribbon icon or the `On This Day: Open panel` command. (Once opened, you won't have to re-open it unless you close it.)

On open, the panel will show a list of daily notes from the current date (i.e. notes from the same date and month but different years) together with a preview. If you switch to a different daily note, the panel will update to show notes from that date.

## Configuration

The plugin depends on the [Daily notes core plugin](https://help.obsidian.md/Plugins/Daily+notes) and uses its Date format and New file location to determine where to find daily notes. Make sure those are set appropriately.

In addition, the plugin exposes the following option:

- Show image preview: by default, the plugin will include the first embedded image from each daily note in its preview. Turn this off if you don't want to see it.

## Tips

- Previews are rendered using Obsidian's native Markdown renderer (the same one used in page previews), with a few adjustments:

1. Properties (YAML metadata / frontmatter) are not shown.
2. The first top-level heading (# Heading) that exactly matches the note's title is not shown.

For example, if your note is named `2025-02-27.md` and the first line of your note is `# 2025-02-27`, that heading will not be displayed in the preview.

3. If you've enabled image previews, the first image in the note is not shown, since it's already displayed in the preview.

## Credits

- [Day One](https://dayoneapp.com) for the original idea
- [Erallie/diarian](https://github.com/Erallie/diarian) for demonstrating that the idea could work in Obsidian
