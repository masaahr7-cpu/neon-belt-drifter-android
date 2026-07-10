import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const androidDir = join(root, "android");

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function write(path, content) {
  ensureDir(dirname(path));
  writeFileSync(path, content);
}

function replaceInFile(path, replacer) {
  if (!existsSync(path)) return;
  const current = readFileSync(path, "utf8");
  const next = replacer(current);
  if (next !== current) writeFileSync(path, next);
}

if (!existsSync(androidDir)) {
  execFileSync("npx", ["cap", "add", "android"], { stdio: "inherit" });
}

execFileSync("npx", ["cap", "sync", "android"], { stdio: "inherit" });

replaceInFile(join(androidDir, "app", "build.gradle"), (text) => text
  .replace('versionName "1.0"', 'versionName "1.0.0"'));

replaceInFile(join(androidDir, "app", "src", "main", "AndroidManifest.xml"), (text) => text
  .replace('android:allowBackup="true"', 'android:allowBackup="false"')
  .replace('android:icon="@mipmap/ic_launcher"', 'android:hardwareAccelerated="true"\n        android:icon="@mipmap/ic_launcher"')
  .replace('android:roundIcon="@mipmap/ic_launcher_round"', 'android:roundIcon="@mipmap/ic_launcher_round"\n        android:usesCleartextTraffic="false"'));

write(join(androidDir, "app", "src", "main", "res", "values", "colors.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#180046</color>
    <color name="colorPrimaryDark">#070016</color>
    <color name="colorAccent">#58F7FF</color>
</resources>
`);

write(join(androidDir, "app", "src", "main", "res", "values", "ic_launcher_background.xml"), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#080018</color>
</resources>
`);

write(join(androidDir, "app", "src", "main", "res", "mipmap-anydpi-v26", "ic_launcher.xml"), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground_neon"/>
</adaptive-icon>
`);

write(join(androidDir, "app", "src", "main", "res", "mipmap-anydpi-v26", "ic_launcher_round.xml"), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground_neon"/>
</adaptive-icon>
`);

write(join(androidDir, "app", "src", "main", "res", "drawable", "ic_launcher_foreground_neon.xml"), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#180046" android:pathData="M54,7C80,7 101,28 101,54C101,80 80,101 54,101C28,101 7,80 7,54C7,28 28,7 54,7Z" />
    <path android:fillColor="#2B0A66" android:pathData="M18,72C33,48 61,29 92,25C98,33 101,43 101,54C101,80 80,101 54,101C39,101 26,94 18,72Z" />
    <path android:fillColor="#58F7FF" android:pathData="M54,18L67,63L54,57L41,63Z" />
    <path android:fillColor="#F6F7FF" android:pathData="M54,25L60,55L54,52L48,55Z" />
    <path android:fillColor="#FF4FD8" android:pathData="M40,61L24,75L45,72Z" />
    <path android:fillColor="#58F7FF" android:pathData="M68,61L84,75L63,72Z" />
    <path android:fillColor="#11152C" android:pathData="M54,33C58,33 61,38 61,45C61,51 58,55 54,55C50,55 47,51 47,45C47,38 50,33 54,33Z" />
    <path android:fillColor="#F4FF5D" android:pathData="M48,71L43,91L51,79Z" />
    <path android:fillColor="#FF4FD8" android:pathData="M60,71L65,91L57,79Z" />
    <path android:fillColor="#7E8798" android:pathData="M78,23L91,29L87,43L73,45L66,34Z" />
    <path android:fillColor="#2E3346" android:pathData="M80,31L87,34L82,39L75,37Z" />
    <path android:fillColor="#58F7FF" android:fillAlpha="0.55" android:pathData="M54,14L70,67L54,59L38,67Z" />
</vector>
`);

console.log("Android project is ready for APK/AAB builds.");
