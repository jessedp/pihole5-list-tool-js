#!/usr/bin/env node
import * as fs from 'fs';
import * as chalk from 'chalk';

import { exec } from 'child_process';
import * as clear from 'clear';

const sqlite3 = require('sqlite3').verbose();

import Axios from 'axios';
import { askSetup, askImportFile, askPaste, confirm } from './inquirer';
import { Row, sourceOptions } from './types';
import { die, validateUrls } from './utils';

import { version } from '../package.json';

clear();

console.log(
    chalk.greenBright(`
    +--------------------------------------+
    |       pihole 5 list adder ${version}      |
    +--------------------------------------+
`),
);

const run = async (): Promise<void> => {
    try {
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

        /** do the ones we're retriving from urls  */
        const result = urlLists.filter((item) => item.id === setup.source);
        if (result && result.length > 0) {
            const item = result[0];
            const list = await Axios.get(item.url);
            if (!list.data) die(`"${item.comment}" is empty! Aborting`);
            const urls = list.data.toString().split('\n');
            urls.forEach((url: string) => {
                if (url.trim()) importList.push({ url: url.trim(), comment: item.comment });
            });
        }

        if (setup.source === sourceOptions.FILE) {
            const options = await askImportFile();
            const data = fs.readFileSync(options.file).toString();
            if (!data.trim()) die(`"${options.file}" is empty! Aborting`);
            const urls = data.toString().split('\n');
            urls.forEach((url: string) => {
                if (url.trim()) importList.push({ url: url.trim(), comment: `From ${options.file}` });
            });
        }

        if (setup.source === sourceOptions.PASTE) {
            const paste = await askPaste();
            const data = paste.content.trim();
            if (!data) die(`"Pasted Content is empty! Aborting`);
            const urls = data.split('\n');
            urls.forEach((url: string) => {
                if (url.trim()) importList.push({ url: url.trim(), comment: `Pasted content` });
            });
        }

        const cleanList = validateUrls(importList);

        let choice = await confirm(`Add ${cleanList.length} block lists to ${setup.gravitydb}?`);

        if (choice.confirm !== true) {
            console.log(chalk.yellow('Nothing changed. Bye.'));
            process.exit();
        }

        let db;
        try {
            db = await new sqlite3.Database(setup.gravitydb, sqlite3.OPEN_READWRITE, (err) => {
                if (err) {
                    die(`Unable to connect to ${setup.gravitydb} - ${err}`);
                }
            });
        } catch (e) {
            console.log('err!');
            process.exit();
        }
        let cnt = 0;

        cleanList.forEach((item) => {
            db.run(`INSERT OR IGNORE INTO adlist (address, comment) VALUES(?,?)`, [item.url, item.comment], (err) => {
                if (err) {
                    console.log(chalk.red(`Problem Inserting: ${err.message}`));
                } else {
                    cnt += 1;
                }
                // get the last insert id == this.lastID?
            });
        });

        db.close();

        console.log(chalk.greenBright(`${cnt} block lists added!`));

        choice = await confirm(`Update Gravity for immediate affect?`);
        if (choice.confirm === true) {
            try {
                await exec('pihole -g', (error, stdout, stderr) => {
                    if (error) die(`${error.message}`);

                    if (stderr) console.log(chalk.redBright(stderr));
                    console.log(chalk.greenBright(stdout));
                });
            } catch (e) {
                console.log(e);
            }
        } else {
            console.log(chalk.blueBright('Update Gravity through the web interface or by running:\n\t# pihole -g'));
        }
    } catch (e) {
        die(e);
    }
};

/** Main thread */
run();
