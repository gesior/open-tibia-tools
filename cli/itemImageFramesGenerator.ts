import {exit} from "node:process";
import {generateItemImageFrames} from "./itemImages";

generateItemImageFrames().catch(function (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    exit(1);
});
