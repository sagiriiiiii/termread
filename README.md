# termread

Read any URL in your terminal. Powered by [Jina AI Reader](https://r.jina.ai).

```
termread https://x.com/akshay_pachaar/status/2041146899319971922
```

![demo](https://github.com/sagiriiiiii/termread/raw/main/demo.gif)

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
- Renders Markdown formatting in your terminal (headings, bold, bullets)
- Detects and displays images via [chafa](https://hpjansson.org/chafa/) if installed
- Works with X/Twitter threads, GitHub issues, blog posts, documentation, and more

## Image rendering

Install `chafa` to render images as colored ASCII art:

```bash
# macOS
brew install chafa

# Ubuntu / Debian
sudo apt install chafa
```

Without chafa, image URLs are shown as dimmed text fallbacks.

## Usage

```bash
termread <url>
termread --help
```

## How it works

`termread` passes your URL through `https://r.jina.ai/<url>`, which strips page chrome and returns clean Markdown. The result is rendered in your terminal using [marked-terminal](https://github.com/mikaelbr/marked-terminal).

## License

MIT
