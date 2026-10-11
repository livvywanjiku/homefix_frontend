import { safeNextPath } from "./navigation.js";
const cases = [
  ["/dashboard", "customer", "/dashboard", "own area, allowed"],
  ["/admin", "customer", "/dashboard", "wrong role -> their home"],
  ["/pro", "professional", "/pro", "own area, allowed"],
  ["/admin/users", "admin", "/admin/users", "own nested area"],
  ["//evil.com", "customer", "/dashboard", "protocol-relative"],
  ["/\\evil.com", "customer", "/dashboard", "backslash-relative"],
  ["https://evil.com", "customer", "/dashboard", "absolute URL"],
  ["javascript:alert(1)", "customer", "/dashboard", "scheme"],
  ["/dashboard?tab=1", "customer", "/dashboard?tab=1", "query preserved"],
  ["/services", "customer", "/services", "public path"],
  ["/\t/evil.com", "customer", "/dashboard", "control char"],
  ["", "customer", "/dashboard", "empty"],
  [null, "customer", "/dashboard", "null"],
  [undefined, "customer", "/dashboard", "undefined"],
];
let bad = 0;
for (const [input, role, want, label] of cases) {
  const got = safeNextPath(input, role);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(26)} ${JSON.stringify(input)} -> ${JSON.stringify(got)}${ok ? "" : ` (want ${JSON.stringify(want)})`}`);
}
console.log(bad === 0 ? `\nall ${cases.length} passed` : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
