# Chinese Deck — PWA Template

This folder lets you host your Chinese decks on any static web host and "Add to Home Screen" on iPad/iPhone for an app-like experience that works offline.

## How to use with your existing decks
1) Put your HTML file(s) into this folder (alongside `numbers.html`).  
2) Place all GIF stroke animations into `media/` and WAV audio into `audio/`, named by pinyin + tone number (e.g., `ma3.gif`, `shui3.wav`).  
3) If two entries share the same pinyin, add `_1`, `_2`, etc. (e.g., `shi2_1.gif`).  
4) Ensure each HTML references files like:  
   - `media/<pinyin>.gif`  
   - `audio/<pinyin>.wav`

## iPad setup
- Upload the entire folder to your host. The service worker and manifest must stay next to your HTML.  
- Open the URL in Safari → Share → Add to Home Screen.  
- After the first load, the deck works offline (media caches on first use).

## If your site lives in a subfolder
The service worker is registered using a relative path (`./service-worker.js`), so it works even if you deploy the whole folder under something like `https://example.com/decks/`.

## Start page
`manifest.webmanifest` currently uses `"start_url": "numbers.html"`. Change that if you want a different default page.

## Optional
- Replace icons in `/icons` with your own branding (keep sizes 192, 512, 180).  
- Bump the `CACHE_NAME` in `service-worker.js` when you want to force users to update cached assets.