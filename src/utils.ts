import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as chalk from 'chalk';

import { Row } from './types';

export function getCurrentDirectoryBase(): string {
    return path.basename(process.cwd());
}

export function directoryExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}

export function validateUrls(rows: Array<Row>): Array<Row> {
    const newList: Array<Row> = [];

    rows.forEach((item) => {
        const result = url.parse(item.url);
        if (!result.hostname) {
            console.log(chalk.yellow(`${item.url} is not valid and will be skipped`));
        } else {
            return newList.push(item);
        }
    });

    return newList;
}

export function die(message: string): void {
    console.log(chalk.bgRed(message));
    process.exit(-1);
}
