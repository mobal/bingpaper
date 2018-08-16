'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yargs = __importStar(require("yargs"));
const bingApiUrl = 'http://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8';
const bingUrl = 'http://bing.com';
let out;
let size;
const argv = yargs.option('output', {
    alias: 'o',
    describe: 'Output path',
    require: true,
}).option('resolution', {
    alias: 'r',
    default: '1920x1080',
    describe: 'Image resolution',
}).argv;
main();
/**
 * Grab the latest daily Bing wallpapers.
 */
function main() {
    out = path.normalize(argv.output);
    size = argv.resolution;
    getLatestImages('hu-hu').then((urlList) => {
        return filter(out, urlList);
    }).then((filteredUrlList) => {
        if (filteredUrlList.length > 0) {
            filteredUrlList.forEach((url) => {
                getImage(url);
            });
        }
        else {
            console.log('You are up to date!');
        }
    }).catch((err) => {
        console.error(err);
    });
}
/**
 * Download the given image.
 * @param url
 * @param f
 */
function downloadImage(url, f) {
    const stream = fs.createWriteStream(f);
    return axios_1.default.get(url, { responseType: 'stream' }).then((res) => {
        if (res.status === 200) {
            res.data.pipe(stream);
            stream.on('finish', () => {
                console.log(f);
                stream.close();
            });
        }
    }).catch((err) => {
        return Promise.reject(err);
    });
}
/**
 * Filter the given URL list.
 * @param urlList List of image urls.
 */
function filter(p, urlList) {
    if (!fs.lstatSync(p).isDirectory) {
        throw new Error(`The given path ('${path}') is not a valid directory!`);
    }
    fs.readdirSync(p, 'utf8').forEach((img) => {
        const current = img.substring(img.lastIndexOf('/') + 1, img.lastIndexOf('_'));
        if (current) {
            const match = urlList.filter((url) => url.includes(current))[0];
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
function getImage(url) {
    // Replace the resolution with the specified value.
    // e.g., /az/hprichbg/rb/Altschlossfelsen_ROW14949645878_1366x768.jpg
    //     to /az/hprichbg/rb/Altschlossfelsen_ROW14949645878_1920x1080.jpg
    const curr = url.replace(url.substring(url.lastIndexOf('_') + 1, url.lastIndexOf('.')), size);
    const fname = curr.substring(url.lastIndexOf('/') + 1, url.length + 1);
    downloadImage(`${bingUrl}/${curr}`, `${out}${fname}`).catch((err) => {
        console.error(err);
    });
}
/**
 * Get the latest image URLs back to eight days.
 * @param locale Locale string
 */
function getLatestImages(locale = 'auto') {
    return axios_1.default.get(`${bingApiUrl}&mk=${locale}`).then((res) => {
        const urlList = new Array();
        if (res.status === 200 && res.data) {
            res.data.images.forEach((img) => {
                urlList.push(img.url);
            });
        }
        return Promise.resolve(urlList);
    }).catch((err) => {
        return Promise.reject(err);
    });
}
