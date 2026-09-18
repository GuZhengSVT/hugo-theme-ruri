"""Regression fixtures: metadata precedence, explicit false, defaults, subpath assets."""
from pathlib import Path
import tempfile, subprocess, shutil
ROOT=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='ruri-features-') as d:
 s=Path(d);(s/'themes').mkdir();(s/'themes/ruri').symlink_to(ROOT)
 (s/'content').mkdir()
 (s/'hugo.toml').write_text('''baseURL="https://example.org/blog/"
theme="ruri"
title="Fixture"
[params]
author="Site Author"
dateFormat="2006-01-02"
[params.footer]
count=false
powered=false
[params.article_copyright]
enable=true
[params.article_copyright.content]
author=true
title=true
link=false
date=true
updated=true
license=true
license_type="by-nc-sa"
''')
 fixtures={'default':[], 'override':['author: Article Author','license: by','article_copyright:','  content:','    title: false','    link: true'], 'off':['article_copyright:','  enable: false'],'legacy-off':['copyright: false']}
 for name,extra in fixtures.items():
  (s/'content'/f'{name}.md').write_text(chr(10).join(['---','title: '+name,'date: 2024-02-03','lastmod: 2025-04-05']+extra+['---','Text']))
 subprocess.run(['hugo','--source',str(s)],check=True,stdout=subprocess.DEVNULL)
 default=(s/'public/default/index.html').read_text();override=(s/'public/override/index.html').read_text()
 assert 'Site Author' in default and 'CC BY-NC-SA 4.0' in default
 assert 'Article Author' in override and 'CC BY 4.0' in override
 assert 'article_copyright.title' not in override
 assert 'https://example.org/blog/override/' in override
 for name in ['off','legacy-off']:
  assert 'class="notice article-copyright"' not in (s/f'public/{name}/index.html').read_text(),name
 assert 'class="site-totals"' not in default
 assert 'data-vendor="/blog/ruri/vendor/"' in default
 assert 'data-index="/blog/pagefind/pagefind.js"' in default
 print('PASS copyright defaults, article overrides, false switches, footer switch, subpath URLs')
