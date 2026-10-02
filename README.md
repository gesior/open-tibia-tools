# Open Tibia Tools

Browser tools for viewing and converting Tibia/OTS DAT, SPR and OTB files.

Uses [@gesior/open-tibia-library](https://www.npmjs.com/package/@gesior/open-tibia-library) for parsing. File pickers and downloads stay in this project.

## Setup

```
npm install
npm run build
```

Then open an HTML file in a browser (Chrome), for example `itemImageFramesGenerator.html`.

`npm run build` also writes the command-line tools to `js/cli/`. Those files bundle their dependencies, so a release can ship them without `node_modules`. Node.js 18+ is still required:

```
node js/cli/itemImageGenerator.js --help
node js/cli/itemImageFramesGenerator.js --help
node js/cli/outfitImageGenerator.js --help
```

## Tools list

- `itemImageGenerator.html` — one PNG per item
- `npm run generate:item-images` — the same single-frame item ZIP from the command line (Node.js 18+). Release build: `node js/cli/itemImageGenerator.js`
- `itemImageFramesGenerator.html` — item animation frames for the PHP GIF/APNG converter
- `npm run generate:item-image-frames` — the same item frame ZIP from the command line (Node.js 18+). Release build: `node js/cli/itemImageFramesGenerator.js`
- `outfitImageGenerator.html` — outfit frames plus PHP outfit host files
- `npm run generate:outfits` — the same outfit ZIP from the command line (Node.js 18+). Release build: `node js/cli/outfitImageGenerator.js`
- `effectFramesGenerator.html` — magic effect frames
- `missileFramesGenerator.html` — missile frames
- `otbEditor.html` — example `items.otb` editor
- `tests.html` — playground

Outfit images from the command line (Node.js 18+):

## CLI Tools

### CLI Outfits generator

All 8.60 outfits idle:
```
npm run generate:outfits -- --spr 860/Tibia.spr --dat 860/Tibia.dat --version 860 --output idle860.zip
```
Using the 'release' version example:
```
node js/cli/outfitImageGenerator.js --spr 860/Tibia.spr --dat 860/Tibia.dat --version 860 --output idle860.zip
```

All 8.60 outfits walking:
```
npm run generate:outfits -- --spr 860/Tibia.spr --dat 860/Tibia.dat --version 860 --no-idle-animation --output walk860.zip
```

All 8.60 outfits walking, but only IDs 128-200:
```
npm run generate:outfits -- --spr 860/Tibia.spr --dat 860/Tibia.dat --version 860 --output idle860_128_200.zip --min-id 128 --max-id 200
```

**For 11+ client files downgraded by SpiderClientConverter.exe use client version 1099.**

- `--version` defaults to `860` (use `1099` for the latest `.dat`+`.spr` format).
- `--spr` and `--dat` with paths to .dat and .spr files are required.
- `--idle-animation` is on by default; `--no-idle-animation` uses the moving animation.
- `--extended-sprites`, `--transparency`, `--enhanced-animations` and `--frame-groups` match the checkboxes on the page.
- `--min-id` and `--max-id` limit which outfit PNGs are written.
- `--output` , defaults to `data.zip`

### CLI Item Images generator - without animation

Single item images from the command line, `items/{id}.png`. Animated items keep the first frame.
- `--only-pickable` is on by default, use `--no-only-pickable` to disable.
- `--otb items.otb` is required, unless you use `--dat-ids`
- `--dat-ids` uses .dat ids and does not need `items.otb`.

8.60 with `items.otb`:
```
npm run generate:item-images -- --spr 860/Tibia.spr --dat 860/Tibia.dat --otb 860/items.otb --version 860 --output items_860.zip
```
Using the 'release' version example:
```
node js/cli/itemImageGenerator.js --spr 860/Tibia.spr --dat 860/Tibia.dat --otb 860/items.otb --version 860 --output items_860.zip
```

15.33 - uses `1099` version - without `items.otb`:
```
npm run generate:item-images -- --spr 1533/Tibia.spr --dat 1533/Tibia.dat --dat-ids --version 1099 --output items_1533.zip
```

### CLI Item Images generator - with animation (frames)

Single item images from the command line, `items/{id}.png`. Animated items keep the first frame.
- `--only-pickable` is on by default, use `no-only-pickable` to disable.
- `--otb items.otb`
- `--dat-ids` uses .dat ids and does not need `items.otb`.

8.60 with `items.otb`:
```
npm run generate:item-image-frames -- --spr 860/Tibia.spr --dat 860/Tibia.dat --otb 860/items.otb --version 860 --output items_860_anim.zip
```
Using the 'release' version example:
```
node js/cli/itemImageFramesGenerator.js --spr 860/Tibia.spr --dat 860/Tibia.dat --otb 860/items.otb --version 860 --output items_860_anim.zip
```

15.33 - uses `1099` version - without `items.otb`:
```
npm run generate:item-image-frames -- --spr 1533/Tibia.spr --dat 1533/Tibia.dat --dat-ids --version 1099 --output items_1533_anim.zip
```

Item animation frames, `items/{id}_{frameCount}.png`:
```
npm run generate:item-image-frames -- --spr Tibia.spr --dat Tibia.dat --version 860 --dat-ids --min-id 100 --max-id 200 --output item-frames.zip
```

`--extended-sprites`, `--transparency`, `--enhanced-animations` and `--frame-groups` match the checkboxes on those pages. Both item commands default to `items.zip`; pass `--output` to keep both archives.

Convert those frames to animated GIF and PNG with `tools/item-image-frames-to-animated-gif-converter/cli_convert.php`. Copy the ZIP into that folder and run PHP from there.

Animated GIF (`item_gifs/{id}.gif` inside the result ZIP):
```
php cli_convert.php GIF items_860_anim.zip
```

Animated PNG / APNG (`item_apngs/{id}.png` inside the result ZIP):
```
php cli_convert.php APNG items_860_anim.zip
```

The result is written to `generated-zip-archives/items_<timestamp>.zip`. Frame duration is 0.2 seconds.

On Windows, unpacking the ZIP in PHP is very slow. Unpack the frames first and pass the folder:
```
php cli_convert.php GIF items_860_anim
php cli_convert.php APNG items_860_anim
```

PHP helpers:
- `tools/item-image-frames-to-animated-gif-converter/` — PNG frames to GIF/APNG
- `tools/colored-outfit-images-generator/` — colored outfit images from exported frames
