"""Multilingual culture routing, category boundaries and subpath module/data URLs."""
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='ruri-culture-') as directory:
    site = Path(directory)
    (site / 'themes').mkdir()
    (site / 'themes/ruri').symlink_to(ROOT)
    (site / 'content/culture').mkdir(parents=True)
    (site / 'hugo.toml').write_text('''baseURL="https://example.org/blog/"
theme="ruri"
defaultContentLanguage="en"
defaultContentLanguageInSubdir=true
[[params.menu]]
name="culture_title"
url="/culture/"
[params.culture]
enable=true
categories=["book","anime","movie","music","game"]
[params.culture.sources]
book="douban"
[params.culture.bangumi]
username="fixture-user"
mode="live"
[params.culture.neodb]
profile="https://example.org/users/fixture-user/"
[params.culture.douban]
user="fixture-user"
[languages.en]
[languages.zh-cn]
[languages.zh-tw]
[languages.ja]
''')
    for lang, title in [('en', 'Arts & Culture'), ('zh-cn', '文艺'), ('zh-tw', '文藝'), ('ja', '文芸')]:
        (site / f'content/culture/_index.{lang}.md').write_text(f'---\ntitle: {title}\nlayout: culture\naliases: ["/watch/"]\nsidebar: false\n---\n')
        for category in ['book', 'anime', 'movie', 'music', 'game']:
            folder = site / 'content/culture' / category
            folder.mkdir(exist_ok=True)
            (folder / f'index.{lang}.md').write_text(f'''---
title: {category}
layout: culture
cultureCategory: {category}
sidebar: false
bangumi:
  username: fixture-user
neodb:
  profile: https://example.org/users/fixture-user/
  data: collections/neodb/
---
''')
    subprocess.run(['hugo', '--source', str(site)], check=True, stdout=subprocess.DEVNULL)
    for lang in ['en', 'zh-cn', 'zh-tw', 'ja']:
        landing = (site / f'public/{lang}/culture/index.html').read_text()
        assert 'data-bangumi-user=' not in landing and 'data-collection-src=' not in landing
        assert 'data-culture-module=' not in landing
        assert (site / f'public/{lang}/watch/index.html').is_file()
        anime = (site / f'public/{lang}/culture/anime/index.html').read_text()
        assert 'data-bangumi-user="fixture-user"' in anime and 'data-collection-category=' not in anime
        assert anime.count('data-bangumi-type=') == 5
        assert 'data-bangumi-type="3" aria-pressed="true"' in anime
        module = re.search(r'data-module="(/blog/bangumi\.[^"/]+\.js)"', anime).group(1)
        assert (site / 'public' / module.removeprefix('/blog/')).is_file()
        for category in ['book', 'movie', 'music', 'game']:
            html = (site / f'public/{lang}/culture/{category}/index.html').read_text()
            assert html.count('data-collection-category=') == 1
            assert f'data-collection-category="{category}"' in html
            provider = 'douban' if category == 'book' else 'neodb'
            assert f'data-collection-src="/blog/collections/{provider}/"' in html, (category, provider, re.findall(r'data-collection-src="[^"]+"',html))
            assert 'data-bangumi-user=' not in html
            assert html.count('aria-current="page"') == 1
    # Total switch and category selection must remove their scripts/data sources.
    config = site / 'hugo.toml'
    original = config.read_text()
    config.write_text(original.replace('enable=true', 'enable=false'))
    subprocess.run(['hugo', '--source', str(site)], check=True, stdout=subprocess.DEVNULL)
    disabled = (site / 'public/en/culture/book/index.html').read_text()
    assert 'Arts and culture is disabled.' in disabled
    assert '<nav class="main-nav" aria-label="Home"></nav>' in disabled
    assert 'data-culture-module=' not in disabled and 'data-collection-src=' not in disabled
    config.write_text(original.replace('categories=["book","anime","movie","music","game"]', 'categories=["anime"]'))
    subprocess.run(['hugo', '--source', str(site)], check=True, stdout=subprocess.DEVNULL)
    assert 'disabled.' in (site / 'public/en/culture/book/index.html').read_text()
    config.write_text(original.replace('mode="live"', 'mode="snapshot"'))
    subprocess.run(['hugo', '--source', str(site)], check=True, stdout=subprocess.DEVNULL)
    snapshot = (site / 'public/en/culture/anime/index.html').read_text()
    assert 'data-bangumi-user=' not in snapshot
    assert 'data-collection-src="/blog/collections/bangumi/"' in snapshot
    assert 'data-shelf="onhold"' in snapshot
    print('PASS culture: four languages, five real category pages, inert landing, isolated sources, subpath URLs, old-route redirects')
