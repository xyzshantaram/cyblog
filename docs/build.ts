import { bundle } from "./src/deps.ts";

const result = await bundle("./src/main.ts", {
    compilerOptions: {
        checkJs: true
    }
});

await Deno.writeTextFile('cyblog.js', result.code);