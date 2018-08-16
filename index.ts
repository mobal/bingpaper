import axios, { AxiosResponse } from 'axios';

import * as fs from 'fs';
import * as path from 'path';
import * as yargs from 'yargs';

const bingApiUrl: string = 'http://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8';
const bingUrl: string = 'http://bing.com';

let out: string;
let size: string;

const argv = yargs.option('output', {
    alias: 'o',
    describe: 'Output path',
    require: true,
}).option('resolution', {
    alias: 'r',
    default: '1920x1080',
    describe: 'Image resolution',
}).argv;

interface ImageJSON {
    startdate: string;
    fullstartdate: string;
    enddate: string;
    url: string;
    urlbase: string;
    copyright: string;
    copyrightLink: string;
    quiz: string;
    wp: boolean;
    hsh: string;
    drk: number;
    top: number;
    bot: number;
    hs: string[];
}

main();

/**
 * Grab the latest daily Bing wallpapers.
 */
function main(): void {
    out = path.normalize(argv.output);
    size = argv.resolution;
    getLatestImages('hu-hu').then((urlList: string[]) => {
        return filter(out, urlList);
    }).then((filteredUrlList: string[]) => {
        if (filteredUrlList.length > 0) {
            filteredUrlList.forEach((url: string) => {
                getImage(url);
            });
        } else {
            console.log('You are up to date!');
        }
    }).catch((err: Error) => {
        console.error(err);
    });
}

/**
 * Download the given image.
 * @param url
 * @param f
 */
function downloadImage(url: string, f: string): Promise<void> {
    const stream: fs.WriteStream = fs.createWriteStream(f);
    return axios.get(url, {responseType: 'stream'}).then((res: AxiosResponse) => {
        if (res.status === 200) {
            res.data.pipe(stream);
            stream.on('finish', () => {
                console.log(f);
                stream.close();
            });
        }
    }).catch((err: Error) => {
        return Promise.reject(err);
    });
}

/**
 * Filter the given URL list.
 * @param urlList List of image urls.
 */
function filter(p: string, urlList: string[]): string[] {
    if (!fs.lstatSync(p).isDirectory) {
        throw new Error(`The given path ('${path}') is not a valid directory!`);
    }
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

/**
 * Download the given URL.
 * @param url URL of the image
 */
function getImage(url: string): void {
    // Replace the resolution with the specified value.
    // e.g., /az/hprichbg/rb/Altschlossfelsen_ROW14949645878_1366x768.jpg
    //     to /az/hprichbg/rb/Altschlossfelsen_ROW14949645878_1920x1080.jpg
    const curr: string = url.replace(url.substring(url.lastIndexOf('_') + 1, url.lastIndexOf('.')), size);
    const fname: string = curr.substring(url.lastIndexOf('/') + 1, url.length + 1);
    downloadImage(`${bingUrl}/${curr}`, `${out}${fname}`).catch((err: Error) => {
        console.error(err);
    });
}

/**
 * Get the latest image URLs back to eight days.
 * @param locale Locale string
 */
function getLatestImages(locale: string = 'auto'): Promise<string[]> {
    return axios.get(`${bingApiUrl}&mk=${locale}`).then((res: AxiosResponse) => {
        const urlList: string[] = new Array<string>();
        if (res.status === 200 && res.data) {
            (res.data.images as ImageJSON[]).forEach((img) => {
                urlList.push(img.url);
            });
        }
        return Promise.resolve(urlList);
    }).catch((err: Error) => {
        return Promise.reject(err);
    });
}
