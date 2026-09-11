import fs from "node:fs";

const path = "components/PrecifiqueJaV2App.tsx";
let source = fs.readFileSync(path, "utf8");

const fixes = [
  ['plan-==="basic"', 'plan==="basic"'],
  ['NAV.map({key,label,icon:Icon})=>', 'NAV.map(({key,label,icon:Icon})=>'],
];

for (const [broken, fixed] of fixes) {
  source = source.replace(broken, fixed);
}

fs.writeFileSync(path, source);
console.log("PrecifiqueJa V2 source verified/repaired for build.");
