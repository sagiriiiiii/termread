# termread

Read any URL in your terminal. Powered by [Jina AI Reader](https://r.jina.ai).

```
termread https://x.com/akshay_pachaar/status/2041146899319971922
```

![demo](https://github.com/sagiriiiiii/termread/raw/main/demo.png)

## Install

```bash
npm install -g termread
```

Or run without installing:

```bash
npx termread <url>
```

## Features

- Strips ads, nav bars, and clutter — shows only the content
- Renders Markdown with visual hierarchy: headings, bold, bullets, code blocks
- Displays images as colored pixel art directly in the terminal — no external tools required
- Works with X/Twitter threads, blog posts, GitHub issues, documentation, and more

## Usage

```bash
termread <url>
termread --help
```

## How it works

`termread` passes your URL through `https://r.jina.ai/<url>`, which strips page chrome and returns clean Markdown. The Markdown is rendered with a custom terminal renderer, and images are decoded and drawn as 24-bit color half-block characters using [jimp](https://github.com/jimp-dev/jimp).

## Requirements

Node.js 18 or later.

## License

MIT
