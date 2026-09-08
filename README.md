# Zgraya smart download

Public, static smart download page for the Zgraya mobile app at
[`https://get.zgraya.app`](https://get.zgraya.app).

Android devices are redirected to Google Play. iPhone, iPad, and iPod devices
are redirected to the App Store. Desktop and unrecognized devices remain on an
accessible fallback page with both official store badges.

## Change a store destination

Edit only [`site/store-links.mjs`](site/store-links.mjs), run the tests, and
merge the change to `main`. No Zgraya app release is required.

## Validate locally

```sh
npm test
python -m http.server 8765 --directory site
```

Then open `http://localhost:8765/`.

## Privacy

The site has no analytics, cookies, browser storage, forms, or external runtime
requests. Its Content Security Policy blocks network connections made by page
scripts.

Official store badge provenance and usage notes are recorded in
[`ASSET_SOURCES.md`](ASSET_SOURCES.md).
