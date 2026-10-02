import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {argv, exit} from "node:process";
import {parseArgs} from "node:util";
import {Client, DatManager, DatThingCategory, GameFeature, ImageGenerator, InputFile, OtbManager, SpriteManager} from "@gesior/open-tibia-library";
import JSZip from "jszip";
import {spriteToPng, spritesToStripPng} from "./spriteStrip";

type ItemExport = "image" | "frames";

const sharedOptions = `
  --version <number>       Client version (default: 860). Use 1099 for the latest .dat+.spr format.
  --spr <path>             Sprite file (required)
  --dat <path>             Dat file (required)
  --otb <path>             OTB file. Required unless --dat-ids is set.
  --dat-ids                Use .dat item ids as image ids (no items.otb)
  --output <path>          Output zip (default: items.zip)
  --min-id <number>        First item id (default: 0)
  --max-id <number>        Last item id (default: last server id, or last dat id with --dat-ids)
  --only-pickable          Export pickupable items only (default)
  --no-only-pickable       Export every item in the id range
  --extended-sprites       Force GameSpritesU32
  --transparency           GameSpritesAlphaChannel
  --enhanced-animations    GameEnhancedAnimations
  --frame-groups           GameIdleAnimations
  --help                   Show this help
`;

const imageUsage = `Usage:
  npm run generate:item-images -- --spr <file.spr> --dat <file.dat> (--otb <file.otb> | --dat-ids) [options]

Writes one PNG per item, items/{id}.png. Animated items keep the first frame only.
` + sharedOptions;

const framesUsage = `Usage:
  npm run generate:item-image-frames -- --spr <file.spr> --dat <file.dat> (--otb <file.otb> | --dat-ids) [options]

Writes one horizontal PNG strip per item, items/{id}_{frameCount}.png.
` + sharedOptions;

function fail(usage: string, message: string): never {
    console.error(message);
    console.error("");
    console.error(usage);
    exit(1);
}

function parseNonNegativeInt(usage: string, flag: string, value: string): number {
    if (!/^\d+$/.test(value)) {
        fail(usage, `${flag} must be a non-negative integer, got "${value}".`);
    }
    return Number(value);
}

async function generateItems(exportMode: ItemExport): Promise<void> {
    const usage = exportMode == "image" ? imageUsage : framesUsage;
    let values: ReturnType<typeof readValues>;
    try {
        values = readValues();
    } catch (error) {
        fail(usage, error instanceof Error ? error.message : String(error));
    }

    if (values.help) {
        console.log(usage);
        exit(0);
    }
    if (!values.spr || !values.dat) {
        fail(usage, "Sprite file (--spr) and dat file (--dat) are required.");
    }
    if (!values["dat-ids"] && !values.otb) {
        fail(usage, "OTB file (--otb) is required. Pass --dat-ids to name images by .dat item id instead.");
    }

    const clientVersion = parseNonNegativeInt(usage, "--version", values.version);
    const minIdArg = values["min-id"] === undefined ? undefined : parseNonNegativeInt(usage, "--min-id", values["min-id"]);
    const maxIdArg = values["max-id"] === undefined ? undefined : parseNonNegativeInt(usage, "--max-id", values["max-id"]);
    const useDatIds = values["dat-ids"];
    const onlyPickable = values["no-only-pickable"] ? false : values["only-pickable"];
    const sprPath = resolve(values.spr);
    const datPath = resolve(values.dat);
    const outputPath = resolve(values.output);

    const client = new Client();
    client.setClientVersion(clientVersion);
    if (values["extended-sprites"]) {
        client.enableFeature(GameFeature.GameSpritesU32);
    }
    if (values.transparency) {
        client.enableFeature(GameFeature.GameSpritesAlphaChannel);
    }
    if (values["enhanced-animations"]) {
        client.enableFeature(GameFeature.GameEnhancedAnimations);
    }
    if (values["frame-groups"]) {
        client.enableFeature(GameFeature.GameIdleAnimations);
    }

    console.log("Loading client version " + clientVersion);
    const spriteManager = new SpriteManager(client);
    console.log("Loading SPR file");
    if (!spriteManager.loadSpr(InputFile.fromUint8Array(new Uint8Array(readFileSync(sprPath))))) {
        fail(usage, "Failed to load SPR file: " + sprPath);
    }

    const datManager = new DatManager(client);
    console.log("Loading DAT file");
    if (!datManager.loadDat(InputFile.fromUint8Array(new Uint8Array(readFileSync(datPath))))) {
        fail(usage, "Failed to load DAT file: " + datPath);
    }

    const otbManager = new OtbManager(client);
    if (!useDatIds) {
        const otbPath = resolve(values.otb as string);
        console.log("Loading OTB file");
        if (!otbManager.loadOtb(InputFile.fromUint8Array(new Uint8Array(readFileSync(otbPath))))) {
            fail(usage, "Failed to load OTB file: " + otbPath);
        }
    }

    const lastId = useDatIds
        ? datManager.getCategory(DatThingCategory.ThingCategoryItem).length
        : otbManager.getLastId();
    const minId = minIdArg === undefined ? 0 : minIdArg;
    const maxId = maxIdArg === undefined ? lastId : maxIdArg;
    if (minId > maxId) {
        fail(usage, "--min-id (" + minId + ") is greater than --max-id (" + maxId + ").");
    }

    const imageGenerator = new ImageGenerator(datManager, spriteManager, otbManager);
    const zip = new JSZip();
    let pngCount = 0;

    for (let serverId = minId; serverId <= maxId; serverId++) {
        console.log(serverId + "/" + maxId);
        if (!addItemFile(zip, imageGenerator, datManager, otbManager, serverId, useDatIds, onlyPickable, exportMode)) {
            continue;
        }
        pngCount++;
    }

    console.log("Packing images to ZIP file");
    const zipBuffer = await zip.generateAsync({type: "nodebuffer"});
    mkdirSync(dirname(outputPath), {recursive: true});
    writeFileSync(outputPath, zipBuffer);
    console.log("ZIP generated: " + outputPath + " (" + zipBuffer.length + " bytes, " + pngCount + " png files)");
}

function addItemFile(zip: JSZip, imageGenerator: ImageGenerator, datManager: DatManager, otbManager: OtbManager, serverId: number, useDatIds: boolean, onlyPickable: boolean, exportMode: ItemExport): boolean {
    let clientItemId = serverId;
    if (!useDatIds) {
        if (!otbManager.isValidOtbId(serverId)) {
            return false;
        }
        clientItemId = otbManager.getItem(serverId).getClientId();
        if (!clientItemId) {
            console.log("otb ID not mapped to any dat ID", serverId);
            return false;
        }
    }

    const itemThingType = datManager.getItem(clientItemId);
    if (!itemThingType) {
        console.log("dat ID not found in dat file", serverId, clientItemId);
        return false;
    }
    if (onlyPickable && !itemThingType.isPickupable()) {
        console.log("skip not pickable", serverId);
        return false;
    }

    if (exportMode == "image") {
        const itemSprite = useDatIds
            ? imageGenerator.generateItemImageByClientId(serverId)
            : imageGenerator.generateItemImageByServerId(serverId);
        if (!itemSprite) {
            return false;
        }
        zip.file("items/" + serverId + ".png", spriteToPng(itemSprite));
        return true;
    }

    const itemSprites = useDatIds
        ? imageGenerator.generateItemImagesByClientId(serverId)
        : imageGenerator.generateItemImagesByServerId(serverId);
    if (!itemSprites || itemSprites.length == 0) {
        return false;
    }
    zip.file("items/" + serverId + "_" + itemSprites.length + ".png", spritesToStripPng(itemSprites));
    return true;
}

function readValues() {
    return parseArgs({
        args: argv.slice(2),
        options: {
            help: {type: "boolean", default: false},
            version: {type: "string", default: "860"},
            spr: {type: "string"},
            dat: {type: "string"},
            otb: {type: "string"},
            "dat-ids": {type: "boolean", default: false},
            output: {type: "string", default: "items.zip"},
            "min-id": {type: "string"},
            "max-id": {type: "string"},
            "only-pickable": {type: "boolean", default: true},
            "no-only-pickable": {type: "boolean", default: false},
            "extended-sprites": {type: "boolean", default: false},
            transparency: {type: "boolean", default: false},
            "enhanced-animations": {type: "boolean", default: false},
            "frame-groups": {type: "boolean", default: false}
        },
        strict: true
    }).values;
}

export function generateItemImages(): Promise<void> {
    return generateItems("image");
}

export function generateItemImageFrames(): Promise<void> {
    return generateItems("frames");
}
