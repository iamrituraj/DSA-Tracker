// Functional tests for tricky batch1 snippets. node scripts/ftest1.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import mod from "./batch1.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ft-"));
function run(name, java, main) {
  const dir = fs.mkdtempSync(path.join(tmp, name + "-"));
  fs.writeFileSync(path.join(dir, "Solution.java"), "import java.util.*;\n" + java);
  fs.writeFileSync(path.join(dir, "Main.java"), main);
  try {
    execSync("javac *.java", { cwd: dir, stdio: "pipe" });
    const out = execSync("java Main", { cwd: dir }).toString().trim();
    console.log(`${out.includes("ALL PASS") ? "PASS" : "FAIL"} ${name}: ${out}`);
  } catch (e) {
    console.log(`ERR ${name}: ${e.stdout?.toString() || e.message}`);
  }
}
const A = (id, lvl = -1) => {
  const aps = mod[id].approaches;
  return aps[lvl >= 0 ? lvl : aps.length - 1].code.java;
};

run("lb-ub", A("a2z-103") + "\n" + A("a2z-104").replace("class Solution", "class S2").replace("}", "", 1).replace(/}\s*$/, "}"), "");
// simpler: test each in isolation via combined classes

function combined(files, main) {
  const dir = fs.mkdtempSync(path.join(tmp, "c-"));
  for (const [f, src] of Object.entries(files))
    fs.writeFileSync(path.join(dir, f + ".java"), "import java.util.*;\n" + src);
  fs.writeFileSync(path.join(dir, "Main.java"), main);
  try {
    execSync("javac *.java", { cwd: dir, stdio: "pipe" });
    const out = execSync("java Main", { cwd: dir }).toString().trim();
    return out;
  } catch (e) { return "ERR " + (e.stdout?.toString() || e.message); }
}

// floor/ceil
console.log("floorceil:", combined({ Solution: A("a2z-106") },
  `class Main{static void e(boolean b,String n){System.out.println(n+"="+(b?"ok":"BAD"));}public static void main(String[]a){Solution s=new Solution();int[]r=s.getFloorAndCeil(new int[]{3,6,7,10,12,15,18,20},8);e(r[0]==7&&r[1]==10,"case8");r=s.getFloorAndCeil(new int[]{3,6,7,10},2);e(r[0]==-1&&r[1]==3,"below");r=s.getFloorAndCeil(new int[]{3,6,7,10},25);e(r[0]==10&&r[1]==-1,\"above\");}}`));

// occurrences
console.log("occur:", combined({ Solution: A("a2z-108") },
  `class Main{public static void main(String[]a){Solution s=new Solution();int[]r=s.occurrencesCount(new int[]{1,1,2,2,2,2,3},7,new int[]{1,2,3,4},4);System.out.println("occur="+java.util.Arrays.toString(r));}}`));

// single element BS
console.log("single:", combined({ Solution: A("a2z-113") },
  `class Main{public static void main(String[]a){Solution s=new Solution();System.out.println("s1="+s.singleNonDuplicate(new int[]{1,1,2,3,3,4,4}));System.out.println("s2="+s.singleNonDuplicate(new int[]{1,1,2}));System.out.println("s3="+s.singleNonDuplicate(new int[]{2}));}}`));

// kth missing
console.log("kth:", combined({ Solution: A("a2z-121") },
  `class Main{public static void main(String[]a){Solution s=new Solution();System.out.println("k1="+s.findKthPositive(new int[]{2,3,4,7,11},5));System.out.println("k2="+s.findKthPositive(new int[]{1,2,3},2));System.out.println("k3="+s.findKthPositive(new int[]{5,6,7,8},1));}}`));

// rotated search
console.log("rot:", combined({ Solution: A("a2z-109") },
  `class Main{public static void main(String[]a){Solution s=new Solution();System.out.println("r1="+s.search(new int[]{7,8,9,1,2,3,4,5,6},1));System.out.println("r2="+s.search(new int[]{7,8,9,1,2,3,4,5,6},15));System.out.println("r3="+s.search(new int[]{4,5,6,7,0,1,2},0));}}`));

// find min
console.log("min:", combined({ Solution: A("a2z-111") },
  `class Main{public static void main(String[]a){Solution s=new Solution();System.out.println("m1="+s.findMin(new int[]{3,4,5,1,2}));System.out.println("m2="+s.findMin(new int[]{4,5,6,7,0,1,2}));System.out.println("m3="+s.findMin(new int[]{1,2,3}));}}`));

fs.rmSync(tmp, { recursive: true, force: true });
