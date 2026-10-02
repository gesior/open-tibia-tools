import {exit} from "node:process";
import {generateItemImages} from "./itemImages";

generateItemImages().catch(function (error: unknown) {
    console.error(error instanceof Error ? error.message : error);
    exit(1);
});
