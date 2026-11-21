// ============================================================================
// ARQON OS — Test du design system (contrat de palette ARQON)
// ============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokens = fs.readFileSync(path.join(__dirname, "../../shared/design/tokens.css"), "utf8").toLowerCase();

const EXPECTED_COLORS = ["#090d16", "#111827", "#182235", "#328bff", "#765bff", "#f5f7fc", "#8b96aa", "#25c98a", "#f5b942", "#f05d6c"];

test("le design system définit la palette ARQON complète", () => {
  for (const c of EXPECTED_COLORS) {
    assert.ok(tokens.includes(c), `couleur ARQON ${c} présente dans les tokens`);
  }
});

test("le design system expose les tokens d'espacement et de typographie", () => {
  assert.ok(tokens.includes("--aq-radius"), "token de rayon présent");
  assert.ok(tokens.includes("--aq-font-mono"), "token typographie mono présent");
  assert.ok(tokens.includes("--aq-glass"), "token glassmorphism présent");
});

test("le mode sombre est la valeur par défaut", () => {
  assert.ok(tokens.includes("--aq-bg: #090d16"), "background sombre par défaut");
});
