"""Rebuild the dashboard: python build_data.py <repo>/data/ data.json && python build_page.py"""
import pathlib, base64, json
here = pathlib.Path(__file__).parent
t = (here / 'template.html').read_text(encoding='utf-8')
d = (here / 'data.json').read_text(encoding='utf-8').replace('</', '<\\/')
page = t.replace('__DATA__', d)
(here.parent/'advanced_results.json').write_text(json.dumps(json.loads(d)['advanced'],indent=2),encoding='utf-8')
page = page.replace('__ADVANCED_JS__', (here/'advanced_ui.js').read_text(encoding='utf-8'))
page = page.replace('__VEGAS_BACKGROUND__', 'data:image/png;base64,'+base64.b64encode((here.parent/'assets/vegas-poker-lounge.png').read_bytes()).decode())
notices = '\n'.join((here/'vendor'/name).read_text(encoding='utf-8') for name in ['VirtualSlotMachine-LICENSE.txt','ThreeJS-LICENSE.txt'])
page = page.replace('__THREE_VENDOR__', '/*\n'+notices+'\n*/\n'+(here/'vendor/three.js').read_text(encoding='utf-8'))
page = page.replace('__WHEEL_JSON__', (here/'vendor/wheel.json').read_text(encoding='utf-8'))
page = page.replace('__WHEEL_TEXTURE__', 'data:image/png;base64,' + base64.b64encode((here/'vendor/wheel.png').read_bytes()).decode())
page = page.replace('__CABINET_TEXTURE__', 'data:image/png;base64,' + base64.b64encode((here.parent/'assets/gilded-cabinet.png').read_bytes()).decode())
page = page.replace('__CASINO_JS__', (here/'casino.js').read_text(encoding='utf-8'))
(here.parent / 'dashboard_royale.html').write_text('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + page.replace('<div class="filters"', '</head><body>\n<div class="filters"', 1) + '\n</body></html>\n', encoding='utf-8')
print('wrote dashboard_royale.html')
