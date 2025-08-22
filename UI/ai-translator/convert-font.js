// convert-font.js
import fs from "fs";

function ttfToBase64(file) {
  return fs.readFileSync(file).toString("base64");
}

const fonts = {
  "NotoSansDevanagari-Regular.ttf":
    "data:font/truetype;base64," +
    ttfToBase64("src/fonts/NotoSansDevanagari-Regular.ttf"),
  "NotoSansDevanagari-Bold.ttf":
    "data:font/truetype;base64," +
    ttfToBase64("src/fonts/NotoSansDevanagari-Bold.ttf"),
};

fs.writeFileSync(
  "src/fonts/NotoSansDevanagari.js",
  "export const notoSans = " + JSON.stringify(fonts, null, 2) + ";\n"
);

console.log("✅ Font conversion complete → src/fonts/NotoSansDevanagari.js");
