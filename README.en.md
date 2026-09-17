# ruri

**[简体中文](README.md) · [English](README.en.md)**

[![Hugo](https://img.shields.io/badge/Hugo_Extended-%E2%89%A5_0.162.1-ff4088?logo=hugo)](https://gohugo.io/)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-f7df1e?logo=javascript&logoColor=black)
![CSS](https://img.shields.io/badge/Style-CSS_%2B_SCSS-1572b6)
![Templates](https://img.shields.io/badge/Templates-Go-00add8?logo=go&logoColor=white)
[![MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
![Status](https://img.shields.io/badge/Status-Release_Candidate-orange)

**A minimal, flat, lightweight Hugo theme for personal journals.**

[Author's blog / live usage](https://www.guzhengsvt.cn/) · [Example site](exampleSite) · [Issues](https://github.com/GuZhengSVT/hugo-theme-ruri/issues) · [Original Reimu theme](https://github.com/D-Sketon/hugo-theme-reimu)

If you enjoy ruri, consider starring the project or visiting the author's blog. The live blog uses personal settings; its content and services are not included here.

> Public release candidate, not a declared stable release. Builds and selected browser interactions have been checked. Full visual, cross-browser and real-provider media acceptance remain open; see [QA_REPORT.md](QA_REPORT.md).

## Features and stack

- Hugo Go Templates, vanilla JavaScript, CSS and a small SCSS component. No frontend framework or npm build step.
- Responsive flat layouts, light/dark themes, post covers, categories and tags.
- Yearly archive timeline, Reimu-derived writing heatmap, search and RSS.
- Collapsible TOC, friend-link shortcodes, optional Waline, KaTeX and Mermaid.
- Floating music player with artwork controls, playlist, seek/volume, playback modes and bilingual lyrics.
- Same-site partial navigation retains the audio instance; refreshes/new tabs do not share playback.
- Simplified Chinese, Traditional Chinese, English and Japanese interface/example content. Basic reading works without JavaScript.

## Requirements

**Hugo Extended 0.162.1+**, tested with 0.162.1. Extended compiles the heatmap SCSS. Check with `hugo version`. Python 3 and Node.js are only needed for automated tests, not normal builds.

## Installation

```sh
hugo new site my-blog
cd my-blog
git init
git submodule add https://github.com/GuZhengSVT/hugo-theme-ruri.git themes/ruri
```

Alternatively, download this repository into your site's `themes/ruri` directory. Keep the folder name consistent with theme = "ruri".

### Option A: start from the complete example

Run only in a new, empty site:

```sh
cp -R themes/ruri/exampleSite/. .
hugo server --disableFastRender
```

### Option B: configure your own site

Put the following in your site's `hugo.toml`. Merge with existing settings; do not duplicate TOML tables.

```toml
baseURL = "https://example.org/"
title = "My Journal"
theme = "ruri"
[outputs]
home = ["HTML", "RSS", "JSON"]
[markup.highlight]
noClasses = false
[params]
mainSections = ["posts"]
author = "Your Name"
description = "A personal journal"
```

Create a post and preview drafts:

```sh
hugo new content posts/hello.md
hugo server -D --disableFastRender
```

Set `draft: false` when ready, then run `hugo --minify`. Deploy the generated `public/` directory. Set baseURL to your real URL, including any deployment subpath.

## Usage and customization

### Homepage, navigation and images

```toml
[params.ruri]
brandMark = "r."
tagline = "Per aspera ad astra."
homeEyebrow = "NOTE, TECH & POEM"
homeHeading = ["A quiet place", "for your words."]
homeSource = "Optional attribution"
caption = "Image caption"
captionTranslation = "Optional translation"
footerText = "Made with care."
favicon = "favicon.svg"

[[params.menu]]
name = "home"
url = "/"
[[params.menu]]
name = "archives"
url = "/archives/"
[[params.menu]]
name = "about"
url = "/about/"
```

Inside your existing [params] table, optionally set banner = "images/banner.webp" for static/images/banner.webp and avatar = "avatar.webp" for static/avatar/avatar.webp. Unconfigured images are omitted. Post front matter accepts cover as an image path/URL or false; detail-page covers retain their original aspect ratio.

### Archives and standalone pages

Create content/archives/_index.md with a title. The archive includes the heatmap, categories and collapsible tags. Older years progressively reveal already-rendered HTML; they are not fetched separately. All years are visible without JavaScript.

Standalone layouts are configured explicitly, not by about/friend/moments folder names. For example, content/about/index.md:

```yaml
---
title: About
compact: true
sidebar: false
contentWidth: narrow
cover: false
comments: false
toc: false
sponsor: false
copyright: false
---
Your biography goes here.
```

compact reduces heading spacing; sidebar:false removes the sidebar; contentWidth:narrow narrows content. Other flags disable the cover, comments, TOC, sponsorship and copyright section. Normal posts need not specify them.

### Optional music and comments

```toml
[params.player]
enable = true
[params.player.aplayer.options]
audio = [{name="Song", artist="Artist", url="https://example.org/song.mp3", cover="https://example.org/cover.jpg", lrc="https://example.org/song.lrc"}]

[params.waline]
enable = true
serverURL = "https://your-waline.example.org"
```

Replace placeholder URLs. No playlist is requested without music configuration; playback never starts automatically. Set params.player.enable=false to disable it.

For Meting, set params.player.meting.meting_api to an endpoint with :server/:type/:id placeholders, and configure server/type/id under params.player.meting.options. Use HTTPS audio. LRC, same-timestamp translated lines and tlyric are supported. Site owners are responsible for CORS, provider availability and media rights.

Waline loads on comment-enabled pages and follows the color theme. Popular posts use actual Waline counts, not fabricated rankings. CDN/media/comment integrations may need CSP and network configuration. Set math:true or mermaid:true on a post to load KaTeX or Mermaid.

### Languages, updates and migration

See [exampleSite/hugo.toml](exampleSite/hugo.toml) for four-language settings, and hello.en.md / hello.zh-cn.md sample content. Theme translations live in i18n/ and can be overridden by your site.

Update a submodule installation:

```sh
git submodule update --remote themes/ruri
```

Back up first and read the changelog. Reimu users should migrate and test settings individually: ruri is not a drop-in replacement for every Reimu option/plugin. Fully reload the browser after asset changes because partial navigation retains existing assets.

## Development and tests

Run in the theme repository root:

```sh
python3 tests/smoke.py
node --check assets/ruri.js
node tests/lyrics.cjs
```

Smoke tests cover minimal/multilingual/subpath sites, local links and search output. Lyric tests cover timing offsets and translation grouping. Tests neither guarantee remote service availability nor replace visual acceptance. See [QA report](QA_REPORT.md), [release checklist](RELEASE_CHECKLIST.md) and [changelog](CHANGELOG.md).

## Credits and Reimu attribution

Special thanks to **[D-Sketon / hugo-theme-reimu](https://github.com/D-Sketon/hugo-theme-reimu)**. ruri is not entirely written from scratch:

- Heatmap logic and SCSS derive from Reimu, adapted for theme colors, layout, archive integration and interactions.
- Some translations, Markdown render hooks, shortcodes, RSS, sharing helpers and analytics integrations inherit from or reference Reimu and the original site.
- The minimal layouts, cards, floating player and partial navigation were implemented or reworked around ruri's design.

The [upstream MIT license and attribution](LICENSE.reimu) are retained. This is an independent project, not an official Reimu release or an endorsement by its author.

## License and content boundaries

Theme code is licensed under the **[MIT License](LICENSE)**. Use, modification and redistribution are permitted subject to retaining the applicable copyright/license notices; software is provided as-is without warranty. Inherited portions also retain LICENSE.reimu.

Only the theme and generic examples are included, not the author's articles, wallpaper, avatar, real playlist or friend data. Third-party images, music, content and services are not relicensed under MIT by this project. Obtain the necessary rights separately.
