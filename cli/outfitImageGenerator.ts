import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {argv, exit} from "node:process";
import {parseArgs} from "node:util";
import {Client, DatManager, DatThingCategory, FrameGroupType, GameFeature, ImageGenerator, InputFile, OtbManager, Sprite, SpriteManager} from "@gesior/open-tibia-library";
import JSZip from "jszip";
import {PNG} from "pngjs";
import {OutfitImagePhpGeneratorCode} from "../outfitImagePhpGeneratorCode";

interface OutfitAnimationImage {
    file: string;
    sprite: Sprite;
}

const usage = `Usage:
  npm run generate:outfits -- --spr <file.spr> --dat <file.dat> [options]

Options:
  --version <number>       Client version (default: 860). Use 1099 for the latest .dat+.spr format.
  --spr <path>             Sprite file (required)
  --dat <path>             Dat file (required)
  --output <path>          Output zip (default: data.zip)
  --min-id <number>        First outfit id (default: 0)
  --max-id <number>        Last outfit id (default: last creature id in the dat)
  --idle-animation         Load idle animation when possible (default)
  --no-idle-animation      Use the moving animation
  --extended-sprites       Force GameSpritesU32
  --transparency           GameSpritesAlphaChannel
  --enhanced-animations    GameEnhancedAnimations
  --frame-groups           GameIdleAnimations
  --help                   Show this help
`;

function fail(message: string): never {
    console.error(message);
    console.error("");
    console.error(usage);
    exit(1);
}

function parseNonNegativeInt(flag: string, value: string): number {
    if (!/^\d+$/.test(value)) {
        fail(`${flag} must be a non-negative integer, got "${value}".`);
    }
    return Number(value);
}

function spriteToPng(sprite: Sprite): Buffer {
    const png = new PNG({width: sprite.getWidth(), height: sprite.getHeight()});
    const pixels = sprite.getPixels().getUint8Array();
    png.data.set(pixels.subarray(0, Math.min(pixels.length, png.data.length)));
    return PNG.sync.write(png);
}

function outfitSpritesForId(imageGenerator: ImageGenerator, outfitId: number, idleAnimation: boolean): OutfitAnimationImage[] | null {
    let outfitSprites: OutfitAnimationImage[] | null = null;
    if (idleAnimation) {
        outfitSprites = imageGenerator.generateOutfitAnimationImages(outfitId, FrameGroupType.FrameGroupIdle);
    }
    if (!outfitSprites || outfitSprites.length == 0) {
        outfitSprites = imageGenerator.generateOutfitAnimationImages(outfitId, FrameGroupType.FrameGroupMoving);
    }
    return outfitSprites;
}

async function main(): Promise<void> {
    let values: ReturnType<typeof parseArgs>["values"];
    try {
        values = parseArgs({
            args: argv.slice(2),
            options: {
                help: {type: "boolean", default: false},
                version: {type: "string", default: "860"},
                spr: {type: "string"},
                dat: {type: "string"},
                output: {type: "string", default: "data.zip"},
                "min-id": {type: "string"},
                "max-id": {type: "string"},
                "idle-animation": {type: "boolean", default: true},
                "no-idle-animation": {type: "boolean", default: false},
                "extended-sprites": {type: "boolean", default: false},
                transparency: {type: "boolean", default: false},
                "enhanced-animations": {type: "boolean", default: false},
                "frame-groups": {type: "boolean", default: false}
            },
            strict: true
        }).values;
    } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
    }

    if (values.help) {
        console.log(usage);
        exit(0);
    }

    if (!values.spr || !values.dat) {
        fail("Sprite file (--spr) and dat file (--dat) are required.");
    }

    const clientVersion = parseNonNegativeInt("--version", values.version);
    const minIdArg = values["min-id"] === undefined ? undefined : parseNonNegativeInt("--min-id", values["min-id"]);
    const maxIdArg = values["max-id"] === undefined ? undefined : parseNonNegativeInt("--max-id", values["max-id"]);
    const idleAnimation = values["no-idle-animation"] ? false : values["idle-animation"];
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
        fail("Failed to load SPR file: " + sprPath);
    }

    const datManager = new DatManager(client);
    console.log("Loading DAT file");
    if (!datManager.loadDat(InputFile.fromUint8Array(new Uint8Array(readFileSync(datPath))))) {
        fail("Failed to load DAT file: " + datPath);
    }

    const creatureCount = datManager.getCategory(DatThingCategory.ThingCategoryCreature).length;
    const minId = minIdArg === undefined ? 0 : minIdArg;
    const maxId = maxIdArg === undefined ? creatureCount : maxIdArg;
    if (minId > maxId) {
        fail("--min-id (" + minId + ") is greater than --max-id (" + maxId + ").");
    }

    const imageGenerator = new ImageGenerator(datManager, spriteManager, new OtbManager(client));
    const zip = new JSZip();
    let pngCount = 0;

    for (let outfitId = minId; outfitId <= maxId; outfitId++) {
        console.log(outfitId + "/" + maxId);
        const outfitSprites = outfitSpritesForId(imageGenerator, outfitId, idleAnimation);
        if (!outfitSprites || outfitSprites.length == 0) {
            continue;
        }

        const outfitThingType = datManager.getOutfit(outfitId);
        if (outfitThingType && outfitThingType.hasBones()) {
            zip.file("outfits_anim/" + outfitId + "/bones.json", JSON.stringify(outfitThingType.getBones()));
        }

        for (const outfitSprite of outfitSprites) {
            zip.file(outfitSprite.file + ".png", spriteToPng(outfitSprite.sprite));
            pngCount++;
        }
    }

    console.log("Packing images to ZIP file");
    new OutfitImagePhpGeneratorCode().addFilesToZip(zip);

    const zipBuffer = await zip.generateAsync({type: "nodebuffer"});
    mkdirSync(dirname(outputPath), {recursive: true});
    writeFileSync(outputPath, zipBuffer);
    console.log("ZIP generated: " + outputPath + " (" + zipBuffer.length + " bytes, " + pngCount + " png files)");
}

main().catch(function (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    exit(1);
});
