const { app, dialog } = require('electron');
const exiftool = require('exiftool-vendored').exiftool;
const fs = require('fs');
const path = require('path');

async function main () {
    const selectedDirectories = dialog.showOpenDialogSync({ properties: ['openDirectory'] });

    if (!selectedDirectories) {
        return;
    }

    const [directory] = selectedDirectories;
    const directoryEntries = fs.readdirSync(directory, { withFileTypes: true });
    const files = directoryEntries
        .filter(entry => entry.isFile())
        .map(file => file.name)
        .filter(file => file !== '.DS_Store')
        .map(file => path.join(directory, file));

    const tasks = files.map(rewriteDate);

    await Promise.all(tasks);
}

async function rewriteDate (file) {
    const tags = await exiftool.read(file);

    await exiftool.write(file, { FileModifyDate: tags.DateTimeOriginal }, ['-overwrite_original']);
}

function quit (app) {
    exiftool.end()
        .then(() => app.quit())
        .catch(error => {
            console.error(error);
            app.quit();
        });
}

app.whenReady()
    .then(main)
    .then(() => quit(app))
    .catch(error => {
        console.error(error);
        quit(app);
    });

app.on('window-all-closed', () => app.quit());
