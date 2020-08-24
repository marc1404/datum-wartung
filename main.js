const Sentry = require('@sentry/electron');

Sentry.init({ dsn: "https://d7e55365ea1f4fea88dd087a200fce2d@o103802.ingest.sentry.io/5403025" });

const { app, dialog } = require('electron');
const exiftool = require('exiftool-vendored').exiftool;
const fs = require('fs');
const path = require('path');
const ProgressBar = require('electron-progressbar');

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

    const progressBar = new ProgressBar({
        title: 'Datum Wartung',
        text: 'Bitte warten...',
        detail: `0/${files.length} - 0%`,
        indeterminate: false,
        browserWindow: {
            webPreferences: {
                nodeIntegration: true
            }
        }
    });

    await rewriteDateOfFiles(files, progressBar);

    progressBar.text = 'Fertig!';

    dialog.showMessageBoxSync({
        type: 'info',
        message: `Das Datum von ${files.length} Dateien wurde erfolgreich gewartet! 🤗 ✅`
    });
}

async function rewriteDateOfFiles (files, progressBar) {
    let finishedCount = 0;

    const tasks = files.map(async (file) => {
        await rewriteDate(file);

        finishedCount++;
        progressBar.value = Math.floor(finishedCount / files.length * 100);
        progressBar.detail = `${finishedCount}/${files.length} - ${progressBar.value}%`;
    });

    await Promise.all(tasks);
}

async function rewriteDate (file) {
    const tags = await exiftool.read(file);
    const { DateTimeOriginal: dateTimeOriginal } = tags;

    if (!dateTimeOriginal) {
        return;
    }

    await exiftool.write(file, { FileModifyDate: dateTimeOriginal }, ['-overwrite_original']);
}

function quit (app) {
    exiftool.end()
        .then(() => app.quit())
        .catch(error => {
            console.error(error);
            dialog.showMessageBoxSync({
                type: 'error',
                message: `${error.message} 😰 ⚠️ `
            });

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
