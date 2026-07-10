import { createGame } from "./game/game.js";
import { initPlatform } from "./platform.js";
import tweaksManifest from "./tweaks.json";
import assetsManifest from "./assets.json";
import "./styles.css";

const app = document.querySelector("#app");
const { sdk, ready, tweaks, assets } = await initPlatform({ tweaksManifest, assetsManifest });

// Keep bootstrap boring; build the actual game in src/game/game.js.
const game = createGame({ mount: app, sdk, ready, tweaks, assets });
game.start();
