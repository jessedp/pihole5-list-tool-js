#!/usr/bin/env node
import * as fs from 'fs';
import * as chalk from 'chalk';

import { exec } from 'child_process';

const sqlite3 = require('sqlite3').verbose();

// import clear = require('clear');

import Axios from 'axios';
import { askSetup, askImportFile, askPaste, confirmImport } from './inquirer';
import { Row, sourceOptions } from './types';
import { validateUrls } from './utils';

import { version } from '../package.json';

// clear();

console.log(
    chalk.greenBright(`
    +--------------------------------------+
    |       pihole 5 list adder ${version}     |
    +--------------------------------------+
`),
);

const run = async (): Promise<void> => {
    const setup = await askSetup();

    type urlItem = { id: number; url: string; comment: string };
    const urlLists: Array<urlItem> = [
        {
            id: sourceOptions.FIREBOG_NOCROSS,
            url: 'https://v.firebog.net/hosts/lists.php?type=nocross',
            comment: 'Firebog | Non-crossed lists',
        },
        {
            id: sourceOptions.FIREBOG_ALL,
            url: 'https://v.firebog.net/hosts/lists.php?type=all',
            comment: 'Firebog | All lists',
        },
        {
            id: sourceOptions.FIREBOG_TICKED,
            url: 'https://v.firebog.net/hosts/lists.php?type=tick',
            comment: 'Firebog | Ticked lists',
        },
    ];

    const importList: Array<Row> = [];
    // { gravitydb: '/etc/pihole/gravity.db', source: 'firebog-nocross' }
    const result = urlLists.filter((item) => item.id === setup.source);

    if (result && result.length > 0) {
        const item = result[0];
        const list = await Axios.get(item.url);
        if (!list.data) throw new Error(`"${item.comment}" is empty! Aborting`);
        const urls = list.data.toString().split('\n');
        urls.forEach((url: string) => {
            if (url.trim()) importList.push({ url: url.trim(), comment: item.comment });
        });
    }

    if (setup.source === sourceOptions.FILE) {
        const options = await askImportFile();
        const data = fs.readFileSync(options.file).toString();
        if (!data.trim()) throw new Error(`"${options.file}" is empty! Aborting`);
        const urls = data.toString().split('\n');
        urls.forEach((url: string) => {
            if (url.trim()) importList.push({ url: url.trim(), comment: `From ${options.file}` });
        });
    }

    if (setup.source === sourceOptions.PASTE) {
        const paste = await askPaste();
        const data = paste.content.trim();
        if (!data) throw new Error(`"Pasted Content is empty! Aborting`);
        const urls = data.split('\n');
        urls.forEach((url: string) => {
            if (url.trim()) importList.push({ url: url.trim(), comment: `Pasted content` });
        });
    }

    const cleanList = validateUrls(importList);

    //console.log(chalk.green(`Adding ${cleanList.length} block lists`));

    const confirm = await confirmImport(cleanList.length, setup.gravitydb);
    console.log(confirm);
    // throw new Error('quit');

    const db = new sqlite3.Database(setup.gravitydb, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
            throw new Error(`Unable to connect to ${setup.gravitydb} - ${err}`);
        }
    });

    cleanList.forEach((item) => {
        db.run(`INSERT OR IGNORE INTO adlist (address, comment) VALUES(?,?)`, [item.url, item.comment], (err) => {
            if (err) {
                console.log(chalk.red(`Problem Inserting: ${err.message}`));
            }
            // get the last insert id == this.lastID?
        });
    });

    // close the database connection
    db.close();
};

/** Main thread */
try {
    run();
} catch (e) {
    console.log(chalk.redBright(`\n\t\t${e}\n`));
}
