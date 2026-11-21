"""Regression fixtures: metadata precedence, explicit false, defaults, subpath assets."""
from pathlib import Path
import json, re
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
 (s/'data').mkdir()
 (s/'data/friends1.json').write_text('[{"name":"Example","url":"https://example.org/","desc":"A blog"}]')
 for section in ['friend','moments']:
  (s/'content'/section).mkdir()
 friend=s/'content/friend/index.md'
 friend.write_text('---\ntitle: Friends\n---\n## Blogs\n{{< friendsLink1 >}}')
 (s/'content/moments/index.md').write_text('---\ntitle: Moments\n---\nOffline introduction.')
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
 for name, kind in [('ruri','css'), ('heat-map','css'), ('ruri','js'), ('features','js')]:
  url=re.search(r'/blog/assets/'+kind+'/'+name+r'\.min\.[a-f0-9]+\.'+kind,default).group(0)
  assert (s/'public'/url.removeprefix('/blog/')).is_file(),url
 assert not list((s/'public').glob('*.css')) and not list((s/'public').glob('*.js'))
 print('PASS copyright defaults, article overrides, false switches, footer switch, subpath URLs')

 legacy=(s/'public/friend/index.html').read_text()
 assert 'class="friend-card"' in legacy and '>Blogs<' in legacy
 moments=(s/'public/moments/index.html').read_text()
 assert 'Offline introduction.' in moments and '<moments-wall' not in moments
 assert (s/'public/ruri/vendor/waline-3.16.2/waline.js').is_file()
 (s/'data/friends4.json').write_text('[{"name":"Resource fixture","url":"https://resource.example.org/","image":"images/resource.png"}]')
 friend.write_text('---\ntitle: Friends\nfriendGroups:\n  friends1: Blogs\n  friends4: Tools\nresourceHeading: Resources\n---\n{{< friend-details "Apply" >}}Send a link.{{< /friend-details >}}')
 subprocess.run(['hugo','--source',str(s)],check=True,stdout=subprocess.DEVNULL)
 directory=(s/'public/friend/index.html').read_text()
 assert directory.index('class="friend-card"') < directory.index('<details class="friend-details">')
 assert 'Send a link.' in directory and '/blog/assets/css/friends.min.' in directory
 assert 'resource.example.org' not in directory and 'images/resource.png' not in directory
 url=re.search(r'<details class="friends-section friend-resources" data-src="(/blog/[^"]+)"',directory).group(1)
 cards=json.loads((s/'public'/url.removeprefix('/blog/')).read_text())
 assert 'class="friend-card"' in cards and 'https://resource.example.org/' in cards and '/blog/images/resource.png' in cards
 print('PASS deferred resource cards and subpath image URLs')
 print('PASS legacy friend shortcodes, directory disclosures, offline moments and bundled client')
