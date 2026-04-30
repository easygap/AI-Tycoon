const { spawnSync } = require("child_process");

process.env.BROWSERSLIST_IGNORE_OLD_DATA = "1";

const cli = require.resolve("tailwindcss/lib/cli.js");
const args = [
    cli,
    "-c", "tailwind.config.js",
    "-i", "./css/tailwind.input.css",
    "-o", "./css/tailwind.generated.css",
    "--minify",
];

const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
});

process.exit(result.status ?? 1);
