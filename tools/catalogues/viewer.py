"""Read the public viewer's static image recipe without running JavaScript."""
import hashlib
import json
import re
from urllib.parse import urlsplit


def literal(scripts, name):
    matches = []
    for script in scripts:
        for match in re.finditer(r'\b(?:let|const|var)\s+' + re.escape(name) + r'\s*=\s*', script):
            tail = script[match.end():]
            # Source uses JSON arrays/objects and simple quoted string literals.
            if tail.startswith("'"):
                value = re.match(r"'([^'\\\r\n]*)'\s*;", tail)
                if value:
                    matches.append(value[1])
            else:
                try:
                    value, _ = json.JSONDecoder().raw_decode(tail)
                    matches.append(value)
                except ValueError:
                    pass
    if len(matches) != 1:
        raise ValueError('viewer_literal_missing_or_ambiguous:' + name)
    return matches[0]


def asset_recipe(script):
    """Resolve only the literal used by the source's own template substitution.

    A changed/ambiguous recipe is drift, not a reason to guess other resolutions.
    """
    variables = re.findall(r'cdnDomain\s*\+\s*flyerPages\[[^\]]+\]\.page\.replace\(["\']%s["\'],\s*([\w$]+)\)', script)
    if not variables:
        raise ValueError('viewer_asset_recipe_drift')
    variable = variables[0]
    values = re.findall(r'(?:\b(?:var|let|const)\s+|,)' + re.escape(variable) + r'\s*=\s*["\'](large|zoomLarge)["\']', script)
    if len(set(values)) != 1:
        raise ValueError('viewer_asset_recipe_drift')
    return {'size': values[0], 'script_sha256': hashlib.sha256(script.encode()).hexdigest()}


def viewer_assets(page, script, listing_url, safe_url):
    recipe = asset_recipe(script)
    source_store = literal(page.inline_scripts, 'storeUrl')
    if safe_url(source_store) != safe_url(listing_url):
        raise ValueError('viewer_store_mismatch')
    cdn = literal(page.inline_scripts, 'cdnDomain')
    if cdn != 'https://img.offers-cdn.net':
        raise ValueError('viewer_cdn_drift')
    pages = literal(page.inline_scripts, 'flyerPages')
    if not isinstance(pages, list) or not 1 <= len(pages) <= 500:
        raise ValueError('viewer_pages_drift')
    assets = []
    for number, item in enumerate(pages, 1):
        template = item.get('page') if isinstance(item, dict) else None
        if not isinstance(template, str) or not re.fullmatch(r'/assets/uploads/flyers/\d+/%s/[A-Za-z0-9_-]+\.(?:jpeg|jpg|png|webp)', template):
            raise ValueError('viewer_page_template_drift')
        assets.append({'page_number': number, 'url': safe_url(cdn + template.replace('%s', recipe['size']))})
    return {'recipe': recipe, 'assets': assets, 'total_pages': len(assets)}


def viewer_script_url(page, safe_url):
    urls = []
    for url in page.script_urls:
        try:
            safe = safe_url(url)
        except ValueError:
            continue
        path = urlsplit(safe).path
        if re.search(r'/booklet/folder-viewer\.[a-f0-9]+\.js$', path):
            urls.append(safe)
    if len(set(urls)) != 1:
        raise ValueError('viewer_script_missing_or_ambiguous')
    return urls[0]
