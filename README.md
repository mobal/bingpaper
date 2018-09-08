# bingpaper

An image downloader for the **Daily Bing Wallpaper**, written in **TypeScript**.

## Installation

Clone this repository and install the dependencies using `npm`:

```console
npm i
```

Compile using `tsc`:

```console
tsc -p "./tsconfig.json"
```

## Usage

To run the application you must specify the **output path** and run using `node` (replace path with the desired directory path):

```console
node dist\index.js --output <path>
```

```console
node dist\index.js --locale hu-hu --output /home/mobal/Pictures/backgrounds/
```