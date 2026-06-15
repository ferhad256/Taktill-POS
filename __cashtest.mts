process.loadEnvFile("server/.env");
const { cashierLogin } = await import("./server/lib/auth.ts");
// Joseph Okello = csh-2, PIN 5678 (from the error's params)
try {
  const r = await cashierLogin("csh-2", "5678");
  console.log("RESULT cashierLogin OK -> token len:", r.token.length, "principal:", r.principal.name, r.principal.role);
} catch (e: any) {
  console.log("RESULT FAIL:", e?.code || e?.message);
}
