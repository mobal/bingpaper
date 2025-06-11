import * as fs from 'fs';
import * as path from 'path';

import axios from 'axios';
import { getLogger, Logger } from 'log4js';
import yargs from 'yargs';

import { Image } from './model/Image';
import {hideBin} from "yargs/helpers";

/**
 * This script downloads the latest Bing wallpapers.
 * It can be used to download the latest wallpapers from Bing.
 * The script will download the latest images and save them to the specified directory.
 * The script will also filter out images that have already been downloaded.
 * The script will also log the progress of the download.
 */
const bingApiUrl: string = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8';
const bingUrl: string = 'https://bing.com';

const argv = yargs()
    .scriptName("bing-wallpaper-downloader")
    .usage('$0 [options]')
    .option('locale', {
        alias: 'l',
        default: 'auto',
        demandOption: false,
        describe: 'Localization',
        nargs: 1,
        type: 'string',
    }).option('output', {
        alias: 'o',
        demandOption: true,
        describe: 'Output path',
        nargs: 1,
        type: 'string',
    }).option('resolution', {
        alias: 'r',
        default: '1920x1080',
        describe: 'Image resolution',
        nargs: 1,
        type: 'string',
    })
    .help()
    .parseSync(hideBin(process.argv));
const log: Logger = getLogger('main');

log.level = 'info';

main();

/**
 * Download the latest daily Bing wallpapers.
 */
function main(): void {
    const destDir = path.resolve(argv.output);
    getLatestImages(argv.locale).then((urlList: string[]) => {
        return filter(path.normalize(destDir), urlList);
    }).then((filteredUrlList: string[]) => {
        if (filteredUrlList.length > 0) {
            filteredUrlList.forEach((url: string) => {
                getImage(url, destDir);
            });
        } else {
            log.info('You are up to date!');
        }
    }).catch((err: Error) => {
        log.error(`Error: ${err.message}`);
    });
}

/**
 * Download the given image.
 * @param url URL of the given image
 * @param f Path, where to save the image
 * @returns Promise<void>
 */
async function downloadImage(url: string, f: string): Promise<void> {
    const stream: fs.WriteStream = fs.createWriteStream(f);
    try {
        const res = await axios.get(url, {responseType: 'stream'});
        if (res.status === 200) {
            res.data.pipe(stream);
            stream.on('finish', () => {
                log.info(f);
                stream.close();
            });
        }
    } catch (err) {
        if (err instanceof Error) {
            log.error(`Failed to download image from ${url}: ${err.message}`);
        }
        throw err;
    }
}

/**
 * Filter the given URL list. Remove if previously downloaded.
 * @param p
 * @param urlList List of image urls
 * @returns string[]
 */
function filter(p: string, urlList: string[]): string[] {
    if (fs.existsSync(p)) {
        fs.readdirSync(p, 'utf8').forEach((img: string) => {
            const current = img.substring(img.lastIndexOf('/') + 1, img.lastIndexOf('_'));
            if (current) {
                const match = urlList.filter((url: string) => url.includes(current))[0];
                if (match) {
                    urlList.splice(urlList.indexOf(match), 1);
                }
            }
        });
        return urlList;
    }
    throw new Error(`The given path ('${p}') is not a valid directory!`);
}

/**
 * Download the given image.
 * @param url URL of the image
 * @param p
 */
function getImage(url: string, p: string): void {
    // Replace the resolution with the specified value.
    // e.g., /az/hprichbg/rb/Altschlossfelsen_ROW14949645878_1366x768.jpg
    //     to /az/hprichbg/rb/Altschlossfelsen_ROW14949645878_1920x1080.jpg
    const imageName: string = url.replace(url.substring(url.lastIndexOf('_') + 1, url.lastIndexOf('.')), argv.resolution);
    const fileName: string = imageName.substring(url.indexOf('.') + 1, url.indexOf('&'));
    downloadImage(bingUrl + imageName, path.join(p, fileName)).catch((err: Error) => {
        throw err;
    });
}

/**
 * Get the latest image URLs back to eight days.
 * @param locale Locale string
 * @returns Promise<string[]>
 */
async function getLatestImages(locale: string = 'auto'): Promise<string[]> {
    try {
        const res = await axios.get(`${bingApiUrl}&mk=${locale}`);
        const urlList: string[] = new Array<string>();
        if (res.status === 200 && res.data) {
            (res.data.images as Image[]).forEach((img) => {
                urlList.push(img.url);
            });
        }
        return urlList;
    } catch (err) {
        if (err instanceof Error) {
            log.error(`Failed to fetch the latest images: ${err.message}`);
        }
        throw err;
    }
}
