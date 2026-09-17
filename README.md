# ruri

**[简体中文](README.md) · [English](README.en.md)**

[![Hugo](https://img.shields.io/badge/Hugo_Extended-%E2%89%A5_0.162.1-ff4088?logo=hugo)](https://gohugo.io/)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-f7df1e?logo=javascript&logoColor=black)
![CSS](https://img.shields.io/badge/Style-CSS_%2B_SCSS-1572b6)
![Templates](https://img.shields.io/badge/Templates-Go-00add8?logo=go&logoColor=white)
[![MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)
![Status](https://img.shields.io/badge/Status-Release_Candidate-orange)

**极简、平面、轻量的 Hugo 个人博客主题。**

[作者博客 / 实际使用站点](https://www.guzhengsvt.cn/) · [通用示例](exampleSite) · [反馈问题](https://github.com/GuZhengSVT/hugo-theme-ruri/issues) · [Reimu 原主题](https://github.com/D-Sketon/hugo-theme-reimu)

喜欢 ruri？欢迎 Star，也欢迎前往作者博客交流。作者博客展示的是个人配置，内容与外部服务不包含在本仓库中。

> 当前为公开候选版，尚未宣布稳定版。构建和部分浏览器交互已验证；完整视觉、跨浏览器和真实音源验收仍有待完成，详见 [QA_REPORT.md](QA_REPORT.md)。

## 特性与技术栈

- Hugo Go Templates + 原生 JavaScript + CSS / 少量 SCSS，无前端框架、无 npm 构建要求。
- 响应式平面布局、深浅色模式、文章封面、分类和标签。
- 年份时间树归档、Reimu 风格写作热力图、搜索与 RSS。
- 可折叠文章目录、友链短代码、可选 Waline 评论、KaTeX 与 Mermaid。
- 浮动音乐播放器：封面控制、歌单、进度和音量、播放顺序、原文/译文歌词。
- 站内局部导航保留播放器实例；刷新、新标签页不共享播放状态。
- 简体中文、繁体中文、英文、日文界面和四语言示例。基础阅读不依赖 JavaScript。

## 环境要求

使用 **Hugo Extended 0.162.1 或更高版本**，目前验证版本为 0.162.1。Extended 用于编译热力图 SCSS。终端运行 `hugo version` 检查。自动测试另需 Python 3 和 Node.js；普通使用不需要 Node.js。

## 安装

```sh
hugo new site my-blog
cd my-blog
git init
git submodule add https://github.com/GuZhengSVT/hugo-theme-ruri.git themes/ruri
```

也可下载本仓库并解压到站点的 `themes/ruri`。安装目录名称应为 `ruri`，与配置一致。

### 方式一：运行完整示例

仅在新建的空站点执行：


```sh
cp -R themes/ruri/exampleSite/. .
hugo server --disableFastRender
```

### 方式二：配置自己的站点

将下列配置写入站点根目录的 `hugo.toml`；已有配置请合并，不要重复声明 TOML 表。

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

创建文章并预览：

```sh
hugo new content posts/hello.md
hugo server -D --disableFastRender
```

预览后设置文章 `draft: false`，再执行 `hugo --minify`，产物在 `public/`。部署时把 baseURL 改为真实地址（含部署子路径）。

## 使用与个性化

### 首页、导航与图片

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

在已有 `[params]` 表内添加 `banner = "images/banner.webp"`（对应 static/images/banner.webp）及 `avatar = "avatar.webp"`（对应 static/avatar/avatar.webp）。不配置时不显示相应图片。文章 front matter 的 `cover` 可设置图片路径或 URL，详情页按原比例显示，设为 false 则关闭。

### 归档与独立页面

创建 `content/archives/_index.md` 并设置 title 即可启用归档。归档含热力图、分类和可折叠标签；年份渐进显示使用已生成的 HTML，不是逐年请求服务器，无 JS 时显示所有年份。

关于、友链、碎碎念可通过 front matter 控制布局，不依赖目录命名。例如 `content/about/index.md`：

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

compact 缩小标题空白；sidebar:false 隐藏侧栏；contentWidth:narrow 收窄内容；其余字段分别控制封面、评论、目录、打赏和版权区。普通文章无需设置这些字段。

### 音乐与评论（可选）

```toml
[params.player]
enable = true
[params.player.aplayer.options]
audio = [{name="Song", artist="Artist", url="https://example.org/song.mp3", cover="https://example.org/cover.jpg", lrc="https://example.org/song.lrc"}]

[params.waline]
enable = true
serverURL = "https://your-waline.example.org"
```

上述 URL 是占位符，需要替换。无音乐配置不请求歌单；不自动播放。设置 params.player.enable=false 可关闭。

Meting 模式：配置 params.player.meting.meting_api 为包含 :server、:type、:id 占位符的接口 URL，并设置 params.player.meting.options 的 server、type、id。音频使用 HTTPS；歌词支持 LRC、相同时间戳译文及 tlyric。跨域/CORS、音源版权和服务可用性由站点维护者负责。

Waline 默认在启用评论的页面加载，并适配深浅色。热门文章需要真实 Waline 阅读数据，不会伪造排行榜。第三方 CDN、音频或评论服务可能需要额外网络/CSP 配置。文章开启 math:true / mermaid:true 后分别加载 KaTeX / Mermaid。

### 多语言、升级与迁移

四语言完整配置见 [exampleSite/hugo.toml](exampleSite/hugo.toml)，内容采用 hello.en.md / hello.zh-cn.md 等命名。主题界面翻译位于 i18n/，可在自己的站点覆盖。

子模块更新：

```sh
git submodule update --remote themes/ruri
```

请先备份并阅读变更记录。Reimu 用户应逐项迁移并测试；本主题借鉴 Reimu，但不是全配置、全插件兼容的替代品。修改主题资源后完整刷新浏览器，避免局部导航沿用旧资源。

## 开发与测试

从主题仓库根目录执行：

```sh
python3 tests/smoke.py
node --check assets/ruri.js
node tests/lyrics.cjs
```

构建测试覆盖最小站点、四语言示例、子目录部署、站内链接与搜索输出。歌词测试覆盖时间偏移和译文组合。它们不保证第三方服务可用，也不替代完整视觉验收。更多见 [验收报告](QA_REPORT.md)、[发布清单](RELEASE_CHECKLIST.md) 和 [变更记录](CHANGELOG.md)。

## 致谢与 Reimu 借鉴说明

特别感谢 **[D-Sketon / hugo-theme-reimu](https://github.com/D-Sketon/hugo-theme-reimu)**。ruri 并非完全从零实现：

- 写作热力图的逻辑及 SCSS 基于 Reimu，调整了布局适配、配色、归档集成与部分交互。
- 部分多语言翻译、Markdown 渲染 hooks、短代码、RSS、分享 helper 与统计集成继承或参考 Reimu 及原站实现。
- ruri 的极简页面布局、卡片、浮动播放器、局部导航等围绕本主题需求重新实现或改造。

完整保留 [Reimu MIT 许可与原作者署名](LICENSE.reimu)。本项目是独立主题，不代表 Reimu 官方，也不暗示原作者为其背书。

## 开源协议与内容边界

主题代码使用 **[MIT License](LICENSE)**，允许使用、修改和再分发，须保留相应版权和许可声明；软件按原样提供，不作担保。继承部分同时保留 LICENSE.reimu。

仓库仅包含主题和通用示例，不包含作者个人文章、壁纸、头像、真实歌单或友链数据。第三方图片、音乐、文章与服务不因使用本主题而获得 MIT 授权，请自行取得使用权。
