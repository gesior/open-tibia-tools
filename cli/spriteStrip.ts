import {Sprite} from "@gesior/open-tibia-library";
import {PNG} from "pngjs";

export function spriteToPng(sprite: Sprite): Buffer {
    const png = new PNG({width: sprite.getWidth(), height: sprite.getHeight()});
    const pixels = sprite.getPixels().getUint8Array();
    png.data.set(pixels.subarray(0, Math.min(pixels.length, png.data.length)));
    return PNG.sync.write(png);
}

export function spritesToStripPng(sprites: Sprite[]): Buffer {
    const frameWidth = sprites[0].getWidth();
    const frameHeight = sprites[0].getHeight();
    const png = new PNG({width: frameWidth * sprites.length, height: frameHeight});

    for (let frame = 0; frame < sprites.length; frame++) {
        const sprite = sprites[frame];
        const pixels = sprite.getPixels().getUint8Array();
        const sourceWidth = sprite.getWidth();
        const copyWidth = Math.min(frameWidth, sourceWidth);
        const copyHeight = Math.min(frameHeight, sprite.getHeight());
        for (let y = 0; y < copyHeight; y++) {
            const sourceRow = y * sourceWidth * 4;
            if (sourceRow >= pixels.length) {
                break;
            }
            const available = Math.min(copyWidth * 4, pixels.length - sourceRow);
            const destRow = (y * png.width + frame * frameWidth) * 4;
            png.data.set(pixels.subarray(sourceRow, sourceRow + available), destRow);
        }
    }

    return PNG.sync.write(png);
}
