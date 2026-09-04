# Open Tibia Tools

Browser tools for viewing and converting Tibia/OTS DAT, SPR and OTB files.

Uses [@gesior/open-tibia-library](https://www.npmjs.com/package/@gesior/open-tibia-library) for parsing. File pickers and downloads stay in this project.

## Setup

```
npm install
npm run build
```

Then open an HTML file in a browser (Chrome), for example `itemImageFramesGenerator.html`.

## Tools

- `itemImageGenerator.html` — item images (PNG/GIF ZIP)
- `itemImageFramesGenerator.html` — item animation frames for the PHP GIF/APNG converter
- `outfitImageGenerator.html` — outfit frames plus PHP outfit host files
- `effectFramesGenerator.html` — magic effect frames
- `missileFramesGenerator.html` — missile frames
- `otbEditor.html` — example `items.otb` editor
- `tests.html` — playground

PHP helpers:

- `tools/item-image-frames-to-animated-gif-converter/` — PNG frames to GIF/APNG
- `tools/colored-outfit-images-generator/` — colored outfit images from exported frames
