"""Build linked dropdown parents with language prefixes and site-owned labels."""
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import tempfile

THEME = Path(__file__).resolve().parents[1]


class Navigation(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inside = False
        self.links = []
        self.labels = []
        self.dropdowns = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'nav' and attrs.get('class') == 'main-nav':
            self.inside = True
        if self.inside and tag == 'a':
            self.links.append(attrs)
        if self.inside and tag == 'details':
            self.dropdowns += 1

    def handle_endtag(self, tag):
        if tag == 'nav':
            self.inside = False

    def handle_data(self, text):
        if self.inside and text.strip():
            self.labels.append(text.strip())


with tempfile.TemporaryDirectory(prefix='ruri-menu-') as tmp:
    site = Path(tmp)
    (site / 'themes').mkdir()
    (site / 'themes/ruri').symlink_to(THEME)
    (site / 'i18n').mkdir()
    (site / 'content').mkdir()
    (site / 'hugo.toml').write_text('''baseURL = "https://example.org/blog/"
theme = "ruri"
defaultContentLanguage = "en"
defaultContentLanguageInSubdir = true
[languages.en]
[languages.zh-cn]
[[params.menu]]
name = "menu_projects"
url = "/projects/"
[[params.menu.children]]
name = "Source"
url = "https://github.com/example/project"
[[params.menu]]
name = "More"
[[params.menu.children]]
name = "menu_projects"
url = "/projects/"
''')
    for lang, label in [('en', 'Projects'), ('zh-cn', '项目')]:
        (site / 'i18n' / f'{lang}.yml').write_text(f'menu_projects: "{label}"\n')
        (site / 'content' / f'projects.{lang}.md').write_text(
            f'---\ntitle: "{label}"\n---\nProject introduction.\n')
    subprocess.run(['hugo', '--source', str(site)], check=True,
                   stdout=subprocess.DEVNULL)
    for lang, label in [('en', 'Projects'), ('zh-cn', '项目')]:
        nav = Navigation()
        nav.feed((site / 'public' / lang / 'projects/index.html').read_text())
        assert nav.dropdowns == 2
        assert nav.labels == [label, 'Source', 'More', label], nav.labels
        assert [link['href'] for link in nav.links] == [
            f'/blog/{lang}/projects/', 'https://github.com/example/project',
            f'/blog/{lang}/projects/'], nav.links
        assert nav.links[0].get('aria-current') == 'page'
    print('PASS linked and toggle-only dropdowns, site translations, language/subpath URLs, current-page state')
