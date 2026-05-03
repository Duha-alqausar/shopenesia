import base64
import json
import os
import re
import shutil
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public' / 'assets'
DOCS = ROOT / 'docs' / 'assets'
MODEL = 'gemini-3.1-flash-image-preview'

PRODUCTS = [
    ('smartwatch', 'modern black smartwatch with glossy screen, silicone strap, premium wearable tech'),
    ('headphones', 'wireless over-ear headphones, matte black and warm orange accents, soft ear cushions'),
    ('backpack', 'urban daily backpack, dark charcoal fabric, orange zipper accents, stylish travel bag'),
    ('sneakers', 'modern cloud-step sneakers, white knit upper, orange sole details, lifestyle footwear'),
    ('rice-cooker', 'compact mini rice cooker, white appliance with orange button, clean kitchen product'),
    ('skincare', 'bright skincare set with cleanser tube, serum bottle, cream jar, soft peach packaging'),
    ('bottle', 'stainless steel water bottle 750ml, brushed metal, orange cap, sports hydration bottle'),
    ('keyboard', 'compact mechanical keyboard, dark keycaps with orange accent keys, RGB subtle glow'),
    ('lamp', 'flexible LED desk lamp, minimalist white and orange design, modern home office accessory'),
    ('powerbank', '20,000 mAh fast charge powerbank, slim black rectangular battery pack with orange USB ports'),
]

STYLE = (
    'Create a square ecommerce product image. Realistic high-quality product render / studio photo, '
    'single product centered, soft orange-to-white gradient background, subtle shadow, marketplace catalog style, '
    'no text, no logo, no watermark, no people, no brand names, no packaging text. '
    'Use a clean modern Indonesian online marketplace aesthetic.'
)

def call_gemini(prompt: str) -> tuple[str, bytes]:
    key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
    if not key:
        raise RuntimeError('GOOGLE_API_KEY/GEMINI_API_KEY not found')
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}'
    body = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'responseModalities': ['TEXT', 'IMAGE']},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=240) as response:
        data = json.load(response)
    parts = data.get('candidates', [{}])[0].get('content', {}).get('parts', [])
    for part in parts:
        inline = part.get('inlineData') or part.get('inline_data')
        if inline and inline.get('data'):
            mime = inline.get('mimeType') or inline.get('mime_type') or 'image/jpeg'
            return mime, base64.b64decode(inline['data'])
    raise RuntimeError('No inline image data returned: ' + json.dumps(data)[:500])

def update_js_paths():
    for path in [ROOT / 'docs' / 'app.js', ROOT / 'public' / 'app.js', ROOT / 'src' / 'app.js']:
        if not path.exists():
            continue
        txt = path.read_text()
        for name, _ in PRODUCTS:
            txt = txt.replace(f'assets/{name}.svg', f'assets/{name}.jpg')
        path.write_text(txt)

def main():
    PUBLIC.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)
    generated = []
    for idx, (name, desc) in enumerate(PRODUCTS, start=1):
        prompt = f'{STYLE}\nProduct: {desc}. Composition: product fills 75% of frame, front three-quarter view, crisp edges.'
        print(f'[{idx}/{len(PRODUCTS)}] generating {name}...', flush=True)
        last_err = None
        for attempt in range(1, 4):
            try:
                mime, data = call_gemini(prompt)
                ext = 'jpg' if 'jpeg' in mime or 'jpg' in mime else 'png'
                public_path = PUBLIC / f'{name}.{ext}'
                docs_path = DOCS / f'{name}.{ext}'
                public_path.write_bytes(data)
                shutil.copy2(public_path, docs_path)
                generated.append(str(public_path.relative_to(ROOT)))
                break
            except Exception as e:
                last_err = e
                print(f'  attempt {attempt} failed: {type(e).__name__}: {e}', flush=True)
                time.sleep(4 * attempt)
        else:
            raise RuntimeError(f'Failed to generate {name}: {last_err}')
        time.sleep(1)
    update_js_paths()
    print('Generated Gemini product images:')
    for item in generated:
        print('-', item)

if __name__ == '__main__':
    main()
