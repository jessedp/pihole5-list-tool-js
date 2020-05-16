import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { sourceOptions } from './types';
import chalk = require('chalk');

export function askSetup(): Record<string, any> {
    const defaultDb = '/etc/pihole/gravity.db';

    const questions = [
        {
            name: 'gravitydb',
            type: 'input',
            default: defaultDb,
            message: `Gravity Db to Update:`,
            validate: (value: string): boolean | string => {
                if (!value.trim() || fs.existsSync(value)) return true;
                return `Please enter a valid file name or nothing for ${defaultDb} ${value}.`;
            },
        },
        {
            name: 'source',
            type: 'list',
            message: `Where are the block lists coming from?`,
            choices: [
                {
                    name:
                        'Firebog | Non-crossed lists: For when someone is usually around to whitelist falsely blocked sites',
                    value: sourceOptions.FIREBOG_NOCROSS,
                    short: 'Firebog (no cross)',
                },
                {
                    name:
                        'Firebog | Ticked lists: For when installing Pi-hole where no one will be whitelisting falsely blocked sites',
                    value: sourceOptions.FIREBOG_TICKED,
                    short: 'Firebog (ticked)',
                },
                {
                    name: 'Firebog | All lists: For those who will always be around to whitelist falsely blocked sites',
                    value: sourceOptions.FIREBOG_ALL,
                    short: 'Firebog (all)',
                },
                {
                    name: 'File    | A file with urls of lists, 1 per line',
                    value: sourceOptions.FIREBOG_ALL,
                    short: 'File',
                },
                {
                    name: 'Paste   | Paste urls of lists, 1 per line - opens editor, save, close',
                    value: sourceOptions.PASTE,
                    short: 'Paste',
                },
            ],
        },
    ];

    return inquirer.prompt(questions);
}

export function askImportFile(): Record<string, any> {
    const questions = [
        {
            name: 'file',
            type: 'input',
            message: 'File to import',
            validate: (value: string): boolean | string => {
                if (fs.existsSync(value)) return true;
                return `Please enter a valid file name.`;
            },
        },
    ];

    return inquirer.prompt(questions);
}

export function askPaste(): Record<string, any> {
    const questions = [
        {
            name: 'content',
            type: 'editor',
            message: 'Opening editor',
            validate: (value: string): boolean | string => {
                if (value) return true;
                return `Please actually enter some data.`;
            },
        },
    ];

    return inquirer.prompt(questions);
}

export function confirm(msg: string): Record<string, any> {
    const questions = [
        {
            name: 'confirm',
            type: 'confirm',
            message: chalk.yellow(msg),
            default: 'y',
        },
    ];

    return inquirer.prompt(questions);
}
