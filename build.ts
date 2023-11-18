import { bundle } from "./src/deps.ts";

const result = await bundle("./src/main.ts");

await Deno.writeTextFile('cyblog.js', result.code);