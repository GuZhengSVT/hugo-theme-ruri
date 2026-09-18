<div align="center">

# hugo-theme-ruri

**极简、平面、轻量的 Hugo 个人博客主题**

[![Hugo Extended](https://img.shields.io/badge/Hugo_Extended-%E2%89%A5_0.162.1-ff4088?logo=hugo)](https://gohugo.io/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
![Status](https://img.shields.io/badge/Status-Release_Candidate-orange)

[作者博客](https://www.guzhengsvt.cn/) · [通用示例](exampleSite) · [变更记录](CHANGELOG.md) · [反馈问题](https://github.com/GuZhengSVT/hugo-theme-ruri/issues)

简体中文 | [English](README.en.md)

</div>

Ruri 从 [hugo-theme-reimu](https://github.com/D-Sketon/hugo-theme-reimu) 改造而来，保留博客常用能力，重新设计页面布局、浮动播放器与站内导航。作者博客使用个人配置；文章、图片、歌单和服务不包含在主题仓库中。

> 当前为公开候选版。构建与部分交互已验证，完整视觉、跨浏览器和真实音源验收情况见 [QA_REPORT.md](QA_REPORT.md)。

## 特性

| 分类 | 功能 |
| --- | --- |
| 页面 | 响应式布局、深浅色模式、封面、分类与标签、归档时间树、写作热力图 |
| 阅读 | 可折叠目录、代码语言栏／复制／折叠、PhotoSwipe 图片灯箱、KaTeX、Mermaid |
| 搜索与订阅 | 多语言 Pagefind 搜索、RSS |
| 评论与统计 | Waline 评论、阅读数／评论数、真实阅读数据热门文章、页脚总字数／阅读时长 |
| 社交 | 分类友链、微信分享二维码、个人二维码弹窗、打赏 |
| 音乐 | 原生浮动播放器、直接歌单／Meting、歌词与译文、进度／音量／播放顺序 |
| 导航与语言 | 站内局部导航保留播放器；简繁中文、英文、日文界面与四语言示例 |

主题使用 Hugo 模板、原生 JavaScript、CSS 与少量 SCSS。基础阅读不依赖 JavaScript；搜索、灯箱和播放器等交互需要 JavaScript。刷新或新开标签页不共享正在播放的音频实例。

## 环境要求

- **Hugo Extended ≥ 0.162.1**：编译热力图 SCSS；通过 `hugo version` 检查。
- **Git**：安装与更新主题。
- **Go ≥ 1.22**：仅 Hugo Module 安装需要，同时遵循所用 Hugo 版本的 Go 要求。
- **Node.js / npm**：使用本文的 Pagefind 索引命令需要；Hugo 本身构建主题不需要 npm。
- 开发测试另需 Python 3.11+。当前验证的 Hugo 版本为 0.162.1。

## 安装

两种方式任选其一。以下命令从新站点开始；已有站点跳过创建步骤，并合并配置，避免重复 TOML 表。

### 方式一：Hugo Module

~~~sh
hugo new site my-blog
cd my-blog
git init
hugo mod init example.org/my-blog
~~~

将 `example.org/my-blog` 替换为你自己的站点模块名。在站点 `hugo.toml` 中添加：

~~~toml
[module]
  [[module.imports]]
    path = "github.com/GuZhengSVT/hugo-theme-ruri"
~~~

~~~sh
hugo mod get github.com/GuZhengSVT/hugo-theme-ruri@main
hugo server --disableFastRender
~~~

此方式无需 `themes/ruri` 目录，也无需 `theme = "ruri"`。将站点的 `go.mod` 和生成的 `go.sum` 提交到自己的仓库；CI 中同样需要安装 Go。主题版本由站点模块文件锁定。

### 方式二：Git submodule

~~~sh
hugo new site my-blog
cd my-blog
git init
git submodule add https://github.com/GuZhengSVT/hugo-theme-ruri.git themes/ruri
~~~

在站点 `hugo.toml` 顶层添加（放在任何 `[表]` 之前）：

~~~toml
theme = "ruri"
~~~

~~~sh
hugo server --disableFastRender
~~~

提交站点时一并提交 `.gitmodules` 和主题子模块指针。其他机器或 CI 克隆已有站点时使用：

~~~sh
git clone --recurse-submodules <你的站点仓库地址>
# 如果已经克隆：
git submodule update --init --recursive
~~~

## 快速开始

### 最小配置与第一篇文章

保留所选安装方式的配置，将下面设置合并到站点 `hugo.toml`。顶层键放在所有 TOML 表之前：

~~~toml
baseURL = "https://example.org/"
title = "My Journal"
defaultContentLanguage = "zh-cn"
hasCJKLanguage = true

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

编辑生成的文章；正式发布前设置 `draft: false`，并把 `baseURL` 改为正式网址，包含部署子路径和结尾 `/`。

### 完整配置与四语言示例

[exampleSite/config/_default/hugo.toml](exampleSite/config/_default/hugo.toml) 提供 Hugo 配置，[params.yaml](exampleSite/config/_default/params.yaml) 提供带中英文注释的主题参数全集。主题参数可放入站点 `config/_default/params.yaml`，**不加 `params:` 外层**；请将已有 `[params]` 设置迁移或合并，避免重复维护。

Submodule 用户可在新建空站点中执行以下命令运行完整示例；先移除或合并 `hugo new site` 生成的根配置，避免同一设置存在两处：

~~~sh
cp -R themes/ruri/exampleSite/. .
hugo server --disableFastRender
~~~

Module 用户可单独克隆本仓库获取 `exampleSite`，复制其中的 `content`、`data` 和 `config` 到空站点；删除示例配置中的 `theme = "ruri"`，保留自己的 `[module]` 导入与站点模块文件。四语言内容需要配套的 `[languages]` 配置。已有博客请按需合并，不要整目录覆盖自己的内容。

## 使用

<details>
<summary>首页、导航与图片</summary>

以下 YAML 示例均写入 `config/_default/params.yaml`：

~~~yaml
banner: images/banner.webp
avatar: avatar.webp
ruri:
  brandMark: "r."
  tagline: Per aspera ad astra.
  homeEyebrow: NOTE, TECH & POEM
  homeHeading: [A quiet place, for your words.]
  footerText: Made with care.
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

`banner` 对应 `static/images/banner.webp`；`avatar` 对应 `static/avatar/avatar.webp`。不配置时不显示对应图片。文章 `cover` 可指定图片路径／URL，`false` 关闭。添加导航后需要创建对应页面。

</details>

<details>
<summary>归档、关于、友链与说说</summary>

- 归档：创建 `content/archives/_index.md`，front matter 设置 `title: 归档`。自动显示时间树、热力图及分类标签。
- 关于：创建 `content/about/index.md`，写入个人介绍。
- 友链：创建 `content/friend/index.md`，使用下面的短代码。
- 说说：创建 `content/moments/index.md`，设置 `comments: true` 并启用 Waline。说说内容由 Waline 评论区承载。**通用演示不配置 Waline 服务，应显示说明文字；接入自己的服务后才能使用。**

独立页面可使用这些布局字段：

~~~yaml
---
title: 关于
compact: true
sidebar: false
contentWidth: narrow
cover: false
comments: false
toc: false
sponsor: false
copyright: false
---
这里写页面正文。
~~~

友链分类仍分别读取 `data/friends1.yml` 至 `data/friends4.yml`；共享渲染模板不会合并数据或改变分类。每份数据使用数组：

~~~yaml
- name: Example
  url: https://example.org/
  desc: A friend's blog
  image: images/friend.webp
~~~

在页面中按需要排列分类标题和短代码：

~~~text
## 博客
{{< friendsLink1 >}}
## 工具
{{< friendsLink2 >}}
~~~

另外两组使用 `friendsLink3`、`friendsLink4`；本地图片放在 `static/images/`。

</details>

<details>
<summary>代码、图片、公式与图表</summary>

带语言标记的 Markdown 代码块自动显示语言栏和复制／折叠按钮；保持 `markup.highlight.noClasses = false` 以适配深浅色。正文图片支持本地 PhotoSwipe 灯箱。

KaTeX 需要在主题参数中设置 `math.katex.enable: true`、文章 front matter 设置 `math: true`，并启用 Hugo Goldmark 的公式透传。完整透传配置见示例 `hugo.toml`。Mermaid 代码块会自动加载图表脚本，也可设置文章 `mermaid: true`。KaTeX 和 Mermaid 使用 CDN 资源。

</details>

<details>
<summary>Waline、文章统计与页脚统计</summary>

~~~yaml
waline:
  enable: true
  serverURL: https://your-waline.example.org
  pageview: true
footer:
  powered: true
  count: true
~~~

替换占位地址为自己的 Waline 服务。文章 `comments: false` 可关闭评论区。阅读数、评论数和热门文章需要真实服务数据；页脚字数与阅读时长由 Hugo 根据当前语言文章计算，不依赖 Waline。其他 Waline 选项见参数全集。

</details>

<details>
<summary>文章版权优先级</summary>

站点参数提供默认值：

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

文章 front matter 的 `author`、`license`／`license_type` 以及 `article_copyright` 配置优先；缺失字段回退到站点参数。例如：

~~~yaml
author: Another Author
license: by-sa
article_copyright:
  content:
    updated: false
~~~

`copyright: false` 或 `article_copyright.enable: false` 关闭整块版权信息；`article_copyright.content` 中的字段可用 `false` 单独关闭。

</details>

<details>
<summary>微信分享、个人二维码与打赏</summary>

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

微信分享生成当前文章地址的二维码；个人二维码读取你放在 `static/images/` 中的图片，通过侧栏链接弹窗显示。文章 `sponsor: false` 可隐藏打赏。

</details>

<details>
<summary>音乐播放器</summary>

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

所有 URL 均为占位符。直接歌单优先于 Meting；不配置有效歌单时不请求音源，不自动播放。歌词支持 LRC 与译文。Meting 的 `player.meting.meting_api` 和 `player.meting.options` 用法见参数全集；接口需支持对应的服务与资源类型。

站内局部导航保留播放实例；音源可用性及跨域权限由音频服务决定。播放顺序、音量和歌词显示通过播放器按钮及本地存储管理。

</details>

## 构建、搜索与部署

~~~sh
hugo --minify
npx -y pagefind@1.4.0 --site public --glob '**/*.html'
~~~

按此顺序执行，然后部署整个 `public/`，包括 `public/pagefind/`。Pagefind 基于构建后的 HTML 索引，不使用旧的 `index.json`。`hugo server` 不自动生成索引；检验搜索时可预览完整产物：

~~~sh
python3 -m http.server 8080 --directory public
~~~

打开 `http://localhost:8080/`。如正式站点部署在子路径，应使用匹配的本地路径或为本地预览单独指定 `baseURL` 后重新构建及索引。

## 更新与迁移

Hugo Module：

~~~sh
hugo mod get github.com/GuZhengSVT/hugo-theme-ruri@main
hugo mod tidy
~~~

将变更后的站点模块文件提交到自己的仓库。

Git submodule：

~~~sh
git submodule update --remote themes/ruri
git add themes/ruri
git commit -m "chore: update ruri theme"
~~~

更新前阅读 [CHANGELOG.md](CHANGELOG.md)。个人配置、内容与覆盖模板应保存在站点仓库。Reimu 用户请逐项迁移：Ruri 不支持 Reimu 的所有配置和插件，已删除的旧字段见 [参数文件末尾](exampleSite/config/_default/params.yaml)。主题资源变动后完整刷新浏览器。

## 开发与测试

在主题仓库根目录运行：

~~~sh
python3 tests/smoke.py
python3 tests/module-build.py
python3 tests/features-build.py
node --check assets/ruri.js
node --check assets/features.js
node tests/lyrics.cjs
~~~

覆盖最小站点、四语言示例、子路径、Module 导入、站内链接、版权优先级与歌词处理；不替代第三方服务或完整视觉验收。参见 [QA_REPORT.md](QA_REPORT.md) 与 [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)。

## 致谢与许可

感谢 [D-Sketon / hugo-theme-reimu](https://github.com/D-Sketon/hugo-theme-reimu)。写作热力图、部分翻译、渲染 hooks、短代码、RSS 和分享等实现继承或参考 Reimu；布局、播放器与导航为 Ruri 改造。Ruri 是独立主题，不代表 Reimu 官方。

代码采用 [MIT License](LICENSE)，继承代码保留 [Reimu 原作者许可](LICENSE.reimu)，第三方资源保留各自许可。个人文章、图片、音乐、友链数据和第三方服务不包含在主题授权范围内。
