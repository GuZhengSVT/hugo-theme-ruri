#!/usr/bin/env python3
"""Synchronize enabled culture providers from the site's effective Hugo params."""
import argparse
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import subprocess
from collection_data import write_pages
from culture_sources import BANGUMI_TYPES, import_bangumi, import_douban, douban_profile

spec = importlib.util.spec_from_file_location('neodb_import', Path(__file__).with_name('import-neodb.py'))
neodb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(neodb)

DEFAULT_SOURCES = {'book': 'neodb', 'anime': 'bangumi', 'movie': 'neodb', 'music': 'neodb', 'game': 'neodb'}
SUPPORTED = {'bangumi': set(BANGUMI_TYPES), 'neodb': {'book', 'movie', 'music', 'game'},
             'douban': {'book', 'movie', 'music', 'game'}}


def sync(config, site, loaders=None):
    if not config.get('enable', False):
        print('Culture is disabled; no collection requests')
        return []
    categories = config.get('categories', list(DEFAULT_SOURCES))
    sources = dict(DEFAULT_SOURCES, **config.get('sources', {}))
    groups = {}
    for category in categories:
        provider = sources.get(category)
        if category not in DEFAULT_SOURCES or provider not in SUPPORTED or category not in SUPPORTED[provider]:
            raise ValueError(f'Unsupported culture source: {category}={provider}')
        mode = config.get('bangumi', {}).get('mode', 'live')
        if provider == 'bangumi' and mode == 'live':
            if category != 'anime':
                raise ValueError('Bangumi live mode supports anime; use snapshot mode for other categories')
            continue
        if provider == 'bangumi' and mode != 'snapshot':
            raise ValueError('culture.bangumi.mode must be live or snapshot')
        groups.setdefault(provider, []).append(category)
    failures = []
    for provider, selected in groups.items():
        settings = config.get(provider, {})
        profile = (settings.get('profile', '') if provider == 'neodb' else
                   'https://bgm.tv/user/' + settings.get('username', '') if provider == 'bangumi' else
                   douban_profile(settings.get('user', '')))
        output = site / 'static/collections' / provider
        try:
            if loaders and provider in loaders:
                result = loaders[provider](settings, selected)
            elif provider == 'neodb':
                result = neodb.import_profile(profile, selected)
            elif provider == 'bangumi':
                result = import_bangumi(settings.get('username', ''), selected)
            else:
                export = settings.get('exportfile')
                result = import_douban(settings.get('user', ''), selected, site / export if export else None)
            result['source'] = {'neodb': 'NeoDB', 'bangumi': 'Bangumi', 'douban': 'Douban'}[provider]
            write_pages(result, output)
            print(f'{provider}: published ' + ', '.join(f'{k}={len(v)}' for k, v in result['categories'].items()))
        except Exception as error:
            failures.append(provider)
            print(f'::warning::{provider} sync failed; keeping valid snapshots: {error}')
            for category in selected:
                first = output / category / 'all/1.json'
                existing = json.loads(first.read_text()) if first.is_file() else {}
                if existing.get('profile') == profile and not existing.get('unavailable'):
                    continue
                write_pages(dict(source=provider.title(), profile=profile, unavailable=True,
                    updated_at=datetime.now(timezone.utc).isoformat(), categories={category: []}), output)
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=Path.cwd())
    parser.add_argument('--config', type=Path, help='Optional effective Hugo config JSON for tests or tooling')
    args = parser.parse_args()
    effective = json.loads(args.config.read_text() if args.config else subprocess.check_output(
        ['hugo', 'config', '--format', 'json', '--source', str(args.site)], text=True))
    sync(effective.get('params', {}).get('culture', {}), args.site)


if __name__ == '__main__':
    main()
