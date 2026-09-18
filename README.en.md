<div align="center">

# hugo-theme-ruri

**A minimal, flat and lightweight Hugo blog theme.**

[![Hugo Extended](https://img.shields.io/badge/Hugo_Extended-%E2%89%A5_0.162.1-ff4088?logo=hugo)](https://gohugo.io/)
[![MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Author's blog](https://www.guzhengsvt.cn/) · [Example site](exampleSite) · [Changelog](CHANGELOG.md) · [Issues](https://github.com/GuZhengSVT/hugo-theme-ruri/issues)

[简体中文](README.md) | English

</div>

Adapted from [hugo-theme-reimu](https://github.com/D-Sketon/hugo-theme-reimu), Ruri redesigns the layout, floating player and local navigation. The author's content and external services are not included.

> Public release candidate. See [QA_REPORT.md](QA_REPORT.md) for verification scope and outstanding visual/browser checks.

## Features

| Area | Features |
| --- | --- |
| Pages | Responsive layout, light/dark mode, covers, taxonomies, archive timeline, writing heatmap |
| Reading | Collapsible TOC, code language/copy/collapse tools, PhotoSwipe, KaTeX, Mermaid |
| Search | Multilingual Pagefind search, RSS |
| Comments and stats | Waline comments/views/counts, popular posts using real data, footer word/reading totals |
| Social | Categorized friend links, WeChat share QR, personal QR dialogs, donations |
| Music | Native player, direct playlist/Meting, lyrics/translations, progress/volume/order controls |
| Navigation | Local navigation preserving the player; English, Simplified/Traditional Chinese and Japanese UI |

Hugo templates, vanilla JavaScript, CSS and a little SCSS. Basic reading works without JavaScript; interactive features require it. Refreshing or opening a new tab does not share the playing audio instance.

## Requirements

- **Hugo Extended >= 0.162.1** (tested version: 0.162.1); Extended compiles SCSS.
- **Git** for installation and updates.
- **Go >= 1.22** for Module installation; also follow your Hugo release's Go requirements.
- **Node.js/npm** for the Pagefind command below. Hugo itself needs no npm build.
- Python 3.11+ for repository tests.

## Installation

Choose one method. Existing sites should skip site creation and merge configuration without duplicate TOML tables.

### Hugo Module

~~~sh
hugo new site my-blog
cd my-blog
git init
hugo mod init example.org/my-blog
~~~

Replace the site module path with your own. Add to `hugo.toml`:

~~~toml
[module]
  [[module.imports]]
    path = "github.com/GuZhengSVT/hugo-theme-ruri"
~~~

~~~sh
hugo mod get github.com/GuZhengSVT/hugo-theme-ruri@main
hugo server --disableFastRender
~~~

No `themes/ruri` directory or `theme = "ruri"` setting is needed. Commit the site's `go.mod` and generated `go.sum`. CI also needs Go. Module files pin the imported version.

### Git submodule

~~~sh
hugo new site my-blog
cd my-blog
git init
git submodule add https://github.com/GuZhengSVT/hugo-theme-ruri.git themes/ruri
~~~

Add this at the top level of `hugo.toml`, before all TOML tables:

~~~toml
theme = "ruri"
~~~

~~~sh
hugo server --disableFastRender
~~~

Commit `.gitmodules` and the submodule pointer. On another machine or CI:

~~~sh
git clone --recurse-submodules <your-site-repository>
# For an existing clone:
git submodule update --init --recursive
~~~

## Quick start

Merge into `hugo.toml` while retaining your chosen installation settings. Place top-level keys before tables:

~~~toml
baseURL = "https://example.org/"
title = "My Journal"
defaultContentLanguage = "en"

[outputs]
home = ["HTML", "RSS"]
[markup.highlight]
noClasses = false
[params]
author = "Your Name"
mainSections = ["posts"]
description = "Notes, ideas, and everyday life."
~~~

~~~sh
hugo new content posts/hello.md
hugo server -D --disableFastRender
~~~

Before publishing, set `draft: false` and your real `baseURL`, including any deployment subpath and trailing slash.

### Complete example

[Example Hugo settings](exampleSite/config/_default/hugo.toml) and [theme parameters](exampleSite/config/_default/params.yaml) have bilingual comments. Put theme parameters in `config/_default/params.yaml` with **no outer `params:` key**; merge existing `[params]` settings.

For an empty submodule site, merge/remove the generated root config first, then:

~~~sh
cp -R themes/ruri/exampleSite/. .
hugo server --disableFastRender
~~~

Module users can clone the theme separately to obtain `exampleSite`. Copy its `content`, `data` and `config` directories, remove `theme = "ruri"` from the example config, and retain the site's module import and module files. The four-language content requires the example language configuration. Do not overwrite an existing site's content.

## Usage

<details>
<summary>Homepage, menu and images</summary>

Add to `config/_default/params.yaml`:

~~~yaml
banner: images/banner.webp
avatar: avatar.webp
ruri:
  brandMark: "r."
  tagline: Per aspera ad astra.
  homeHeading: [A quiet place, for your words.]
menu:
  - name: home
    url: /
  - name: archives
    url: /archives/
  - name: friend
    url: /friend/
  - name: moments
    url: /moments/
~~~

Place the banner at `static/images/banner.webp` and avatar at `static/avatar/avatar.webp`. Missing settings hide the images. Article `cover` accepts a path/URL or `false` to hide it. Create a page for each internal menu link.

</details>

<details>
<summary>Archives, about, friends and moments</summary>

Create `content/archives/_index.md` with a title for the archive timeline and heatmap. Create `content/about/index.md` for a biography and `content/friend/index.md` for friend links. Independent pages support:

~~~yaml
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
Your biography.
~~~

Moments at `content/moments/index.md` use the **Waline comment area**: set `comments: true` and configure your own Waline service. The generic demo does not configure Waline and should display an explanation.

Friend categories read separate `data/friends1.yml` through `data/friends4.yml` files; sharing the renderer does not merge categories. Each file contains an array:

~~~yaml
- name: Example
  url: https://example.org/
  desc: A friend's blog
  image: images/friend.webp
~~~

Place local images under `static/images/`. Add category headings and shortcodes:

~~~text
## Blogs
{{< friendsLink1 >}}
## Tools
{{< friendsLink2 >}}
~~~

The other groups use `friendsLink3` and `friendsLink4`.

</details>

<details>
<summary>Code, images, math and diagrams</summary>

Fenced code blocks display language/copy/collapse controls. Keep `markup.highlight.noClasses = false` for theme-aware highlighting. Content images use a local PhotoSwipe lightbox.

KaTeX requires `math.katex.enable: true` in theme parameters, `math: true` in page front matter and Goldmark passthrough (see example Hugo config). Mermaid fences automatically load the diagram script; `mermaid: true` is also supported. KaTeX and Mermaid use CDN assets.

</details>

<details>
<summary>Waline and statistics</summary>

~~~yaml
waline:
  enable: true
  serverURL: https://your-waline.example.org
  pageview: true
footer:
  powered: true
  count: true
~~~

Replace the placeholder endpoint. Page `comments: false` disables comments. Views, comment counts and popular posts require real service data. Footer word/reading totals are computed by Hugo for the current language and do not require Waline.

</details>

<details>
<summary>Copyright precedence</summary>

Set site defaults in parameters:

~~~yaml
article_copyright:
  enable: true
  content:
    author: true
    title: true
    link: true
    date: true
    updated: true
    license: true
    license_type: by-nc-sa
~~~

Page `author`, `license`/`license_type` and `article_copyright` override site defaults; missing fields inherit. Example front matter:

~~~yaml
author: Another Author
license: by-sa
article_copyright:
  content:
    updated: false
~~~

`copyright: false` or `article_copyright.enable: false` disables the entire notice; individual `article_copyright.content` fields accept `false`.

</details>

<details>
<summary>QR codes and donations</summary>

~~~yaml
share: [weixin, twitter]
social:
  - name: weixin
    url: images/wechat-qr.webp
  - name: qq
    url: images/qq-qr.webp
sponsor:
  enable: true
  qr:
    - name: Donate
      src: images/donate.webp
~~~

WeChat sharing generates a QR for the current article. Personal QR dialogs display your images from `static/images/` through sidebar links. Page `sponsor: false` hides donations.

</details>

<details>
<summary>Music player</summary>

~~~yaml
player:
  enable: true
  audio:
    - name: Example track
      artist: Example artist
      url: https://example.org/audio/song.mp3
      cover: https://example.org/images/cover.webp
      lrc: https://example.org/audio/song.lrc
      tlyric: https://example.org/audio/song-translated.lrc
~~~

Replace all placeholder URLs. Direct tracks take priority over Meting. No configured playlist means no audio request; the player never autoplays. It supports LRC and translated lyrics. See the parameter reference for `player.meting.meting_api` and `player.meting.options`.

Local navigation preserves playback. Audio availability and CORS depend on the service. Playback order, volume and lyric display are controlled by buttons and local storage.

</details>

## Build, search and deploy

~~~sh
hugo --minify
npx -y pagefind@1.4.0 --site public --glob '**/*.html'
~~~

Deploy all of `public/` including `public/pagefind/`. Pagefind indexes generated HTML, replacing the old `index.json`. `hugo server` does not generate the index. To preview the complete build:

~~~sh
python3 -m http.server 8080 --directory public
~~~

Open `http://localhost:8080/`. Subpath deployments need a matching preview path or a separate local `baseURL` followed by a rebuild and reindex.

## Updates and migration

Hugo Module:

~~~sh
hugo mod get github.com/GuZhengSVT/hugo-theme-ruri@main
hugo mod tidy
~~~

Commit changed site module files. Git submodule:

~~~sh
git submodule update --remote themes/ruri
git add themes/ruri
git commit -m "chore: update ruri theme"
~~~

Read [CHANGELOG.md](CHANGELOG.md) first. Keep personal configuration, content and overrides in your site repository. Ruri does not support every Reimu plugin or setting; removed legacy fields are listed at the end of the [parameter reference](exampleSite/config/_default/params.yaml). Fully refresh after theme asset changes.

## Development and tests

~~~sh
python3 tests/smoke.py
python3 tests/module-build.py
python3 tests/features-build.py
node --check assets/ruri.js
node --check assets/features.js
node tests/lyrics.cjs
~~~

Tests cover minimal/example/subpath builds, Module imports, links, copyright precedence and lyrics. They do not replace visual QA or third-party service checks. See [QA_REPORT.md](QA_REPORT.md) and [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

## Credits and license

Thanks to [D-Sketon / hugo-theme-reimu](https://github.com/D-Sketon/hugo-theme-reimu). Heatmap, some translations, render hooks, shortcodes, RSS and sharing implementations inherit or adapt Reimu work. Ruri redesigns the layout, player and navigation. It is an independent theme, not an official Reimu project.

Code uses the [MIT License](LICENSE); inherited code retains [Reimu's license](LICENSE.reimu) and bundled resources retain their respective licenses. Personal articles, images, music, friend data and services are outside the theme's license scope.
