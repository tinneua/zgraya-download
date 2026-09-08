# Smart download asset sources

The public page uses provider-supplied badge artwork without modifying the asset files. CSS changes only their rendered size while preserving each intrinsic aspect ratio.

## App Store

- Source: `https://toolbox.marketingtools.apple.com/api/badges/download-on-the-app-store/black/uk-ua?size=250x83`
- Retrieved: 2026-09-08
- Stored as: `site/badges/app-store-en.svg`
- SHA-256: `A26FC5B38380272C92E9019A2EB8B45542A66814B3E2B203772DB8904B9FB99F`
- Note: Apple's endpoint returned its official English `Download on the App Store` SVG for this locale request.
- Guidelines: `https://developer.apple.com/app-store/marketing/guidelines/`

## Google Play

- Source: `https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png`
- Retrieved: 2026-09-08
- Stored as: `site/badges/google-play-en.png`
- SHA-256: `F72611E2DF8E88204009FD896D05D5E8E83C77009C63943BBFFA169559934849`
- Guidelines and badge generator: `https://play.google.com/console/about/brand-and-marketing/`

Do not redraw, recolor, crop, translate, animate, or otherwise alter either badge. If provider guidance or artwork changes, download a fresh official asset, update this receipt, and re-run `npm test` before publishing.
