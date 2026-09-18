"""Build the full example via a local Hugo Module replacement; no themes directory."""
from pathlib import Path
import shutil
import subprocess
import tempfile

THEME = Path(__file__).resolve().parents[1]
MODULE = 'github.com/GuZhengSVT/hugo-theme-ruri'
with tempfile.TemporaryDirectory(prefix='ruri-module-') as tmp:
    site = Path(tmp) / 'site'
    shutil.copytree(THEME / 'exampleSite', site)
    config = site / 'config/_default/hugo.toml'
    config.write_text(config.read_text().replace('theme = "ruri"', '') +
                      '\n[module]\n[[module.imports]]\npath = "' + MODULE + '"\n')
    subprocess.run(['hugo', 'mod', 'init', 'example.org/module-test'], cwd=site, check=True)
    subprocess.run(['go', 'mod', 'edit', '-require=' + MODULE + '@v0.0.0',
                    '-replace=' + MODULE + '=' + str(THEME)], cwd=site, check=True)
    subprocess.run(['hugo', '--minify'], cwd=site, check=True)
    output = site / 'public'
    for language in ['en', 'zh-cn', 'zh-tw', 'ja']:
        page = output / language / 'archives/index.html'
        assert page.is_file(), page
        assert 'id=heatmap' in page.read_text() or 'id="heatmap"' in page.read_text()
    assert list(output.rglob('*.css')), 'Module assets missing'
    assert list(output.rglob('*.js')), 'Module scripts missing'
    assert not list(output.rglob('index.json')), 'Legacy search output exists'
    assert not (site / 'themes').exists()
    print('PASS module: four languages, archive heatmap, assets, no themes directory')
