// Tests du moteur d'annuaire (obligatoires avant toute publication) :  node tools/test_site.mjs
// Fichiers fabriqués, sécurité, liens, fiches retirées, crédit OpenStreetMap, comportement dans un faux navigateur (jsdom).
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash } from "crypto";
import { createRequire } from "module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lire = f => readFileSync(join(root, f), "utf8");
let ko = 0, ok = 0;
const check = (nom, cond) => { if (cond) { ok++; } else { ko++; console.log("ÉCHEC " + nom); } };
const C = JSON.parse(lire("config.json"));
const BASE = new URL(C.url).pathname;

// toutes les pages fabriquées
const pages = [];
(function parcourir(d) {
  for (const n of readdirSync(join(root, d))) {
    if (["node_modules", ".git", "tools", "donnees", "assets"].includes(n)) continue;
    const p = d ? d + "/" + n : n;
    if (statSync(join(root, p)).isDirectory()) parcourir(p); else if (n === "index.html") pages.push(p);
  }
})("");
const osm = JSON.parse(lire("donnees/osm.json")).fiches;
const retraits = existsSync(join(root, "donnees/retraits.json")) ? JSON.parse(lire("donnees/retraits.json")).ids : [];
const manuels = existsSync(join(root, "donnees/manuels.json")) ? JSON.parse(lire("donnees/manuels.json")).fiches : [];
const inscrits = existsSync(join(root, "donnees/inscrits.json")) ? JSON.parse(lire("donnees/inscrits.json")).fiches : [];
const attendues = [...osm, ...manuels, ...inscrits].filter(f => !retraits.includes(f.id));
const fichesPages = pages.filter(p => p.startsWith("fiche/"));

// -- structure
check("accueil, à propos, professionnels et 24 pages de gouvernorat", ["index.html", "a-propos/index.html", "inscription/index.html"].every(p => pages.includes(p)) && pages.filter(p => p.startsWith("gouvernorat/")).length === 24);
check(`une page par fiche (au plus ${attendues.length} : doublons fusionnés), aucune fiche retirée publiée`, fichesPages.length <= attendues.length && fichesPages.length >= attendues.length * 0.8 && retraits.every(id => !existsSync(join(root, "fiche", id))));
check("au moins une fiche (le relevé OpenStreetMap a fonctionné)", attendues.length > 0);
check("fiches « web » : chacune a le lien de la page publique de l'établissement et la date de relevé, affichés sur sa fiche",
  manuels.every(f => f.source === "web" && /^https?:\/\//.test(f.source_url || "") && f.releve && existsSync(join(root, "fiche", f.id, "index.html")) && lire(`fiche/${f.id}/index.html`).includes("sa page publique")));

// -- chaque page
const ldOk = s => [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].every(m => { try { JSON.parse(m[1]); return true; } catch { return false; } });
let pbSecu = [], pbSeo = [], pbLiens = [];
for (const p of pages) {
  const s = lire(p);
  const scripts = [...s.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)];
  if (!s.includes('http-equiv="Content-Security-Policy"') || scripts.some(m => m[1].trim()) || /\son[a-z]+=/i.test(s.replace(/<script[\s\S]*?<\/script>/g, "")) || /style="/.test(s)) pbSecu.push(p);
  if (!/<title>[^<]{10,}<\/title>/.test(s) || !/name="description" content="[^"]{30,}"/.test(s) || !s.includes('rel="canonical"') || !ldOk(s)) pbSeo.push(p);
  const dossier = p.replace(/index\.html$/, "");
  for (const m of s.matchAll(/href="([^"#?:]+)(?:[?#][^"]*)?"/g)) {
    const h = m[1]; if (h.startsWith("//")) continue;
    const cible = join(root, dossier, h.split("&amp;")[0]);
    if (!existsSync(cible) && !existsSync(join(cible, "index.html"))) pbLiens.push(`${p} → ${h}`);
  }
}
check(`sécurité : CSP, aucun script en ligne, aucun on…= ni style="" (${pbSecu.slice(0, 3).join(", ")})`, !pbSecu.length);
check(`référencement : titre, description, canonique, JSON-LD valide (${pbSeo.slice(0, 3).join(", ")})`, !pbSeo.length);
check(`liens internes vers des fichiers existants (${pbLiens.slice(0, 3).join(" ; ")})`, !pbLiens.length);

// -- fiches
const f0 = attendues[0];
const s0 = lire(`fiche/${f0.id}/index.html`);
check("fiche : crédit OpenStreetMap (ODbL) et liens corriger / retirer", /OpenStreetMap/.test(s0) && /ODbL/.test(s0) && s0.includes(`inscription/?fiche=${f0.id}&amp;action=retirer`) && s0.includes("action=corriger"));
check("fiche : téléphone en lien tel:+216 et WhatsApp seulement pour un portable", attendues.filter(f => f.tel).every(f => { const s = lire(`fiche/${f.id}/index.html`); return s.includes(`tel:+216${f.tel}`) && (s.includes(`wa.me/216${f.tel}`) === /^[2459]/.test(f.tel)); }));
check("fiche : JSON-LD du bon type (" + (C.schema || "LocalBusiness") + ")", s0.includes(`"@type":"${C.schema || "LocalBusiness"}"`));
check("« gratuit » dans le titre ou la description de l'accueil et des gouvernorats", [lire("index.html"), lire("gouvernorat/tunis/index.html")].every(s => /<title>[^<]*gratuit|name="description" content="[^"]*gratuit/i.test(s)));
check("à propos : sources OpenStreetMap / ODbL, retrait, statistiques sans cookies", /ODbL/.test(lire("a-propos/index.html")) && /retrait/i.test(lire("a-propos/index.html")) && /GoatCounter/.test(lire("a-propos/index.html")));
check("inscriptions : formulaire de demande (ajout / correction / retrait), envoi Formspree, mention des données", /value="retirer"/.test(lire("inscription/index.html")) && lire("inscription/index.html").includes(C.formspree) && /ne sont pas publiées/.test(lire("inscription/index.html")));

// -- checklist visuelle obligatoire (règle d'Ahmed du 05/10/2026 : aucun site « basique »)
const P = C.photo || {};
check("photo du bandeau : fichier présent (≤ 200 Ko), crédit complet (auteur, licence, lien Wikimedia) sur l'accueil",
  !!P.fichier && existsSync(join(root, P.fichier)) && statSync(join(root, P.fichier)).size <= 200 * 1024 && P.auteur && P.licence && P.licence_url && /commons\.wikimedia\.org/.test(P.source || "") &&
  lire("index.html").includes(P.fichier) && lire("index.html").includes(P.licence) && /Wikimedia Commons/.test(lire("index.html")));
check("image en couleur pour chaque métier (assets/metiers/<id>.svg), affichée sur les fiches",
  C.metiers.every(m => existsSync(join(root, "assets/metiers", m.id + ".svg")) && /<svg[\s\S]*viewBox/.test(lire("assets/metiers/" + m.id + ".svg"))) && s0.includes("assets/metiers/" + f0.metier + ".svg"));
check("image d'aperçu WhatsApp : fichier JPEG < 250 Ko déclaré dans les pages",
  !!C.og_image && existsSync(join(root, "assets", C.og_image)) && statSync(join(root, "assets", C.og_image)).size < 250 * 1024 && lire("index.html").includes("assets/" + C.og_image));

check("carte de la Tunisie EN HAUT (bandeau) : accueil (24 bulles cliquables) et page de gouvernorat (le sien en surbrillance)", /class="hero-carte"/.test(lire("index.html")) && /class="hero-carte petite"/.test(lire("gouvernorat/sfax/index.html")) &&
  (lire("index.html").match(/class="tn-b[^"]*" data-gouv=/g) || []).length === 24 && lire("index.html").includes('href="gouvernorat/tunis/" class="tn-b') &&
  /class="tn-b[^"]*actif[^"]*" data-gouv="sfax"/.test(lire("gouvernorat/sfax/index.html")));

// -- consigne sécurité commune
const rob = lire("robots.txt");
check("robots.txt : tous les robots d'IA et aspirateurs de la consigne refusés, moteurs de recherche autorisés",
  ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "CCBot", "Google-Extended", "Applebot-Extended", "PerplexityBot", "Bytespider", "Amazonbot", "Meta-ExternalAgent", "FacebookBot", "Diffbot", "Omgilibot", "cohere-ai", "ImagesiftBot", "HTTrack", "WebCopier", "WebZIP", "Offline Explorer", "wget", "SiteSnagger"].every(b => rob.includes("User-agent: " + b + "\nDisallow: /")) && !rob.includes("User-agent: Googlebot\nDisallow"));
check("anti-copie : meta noai sur chaque page, script de protection (copie, clic droit), listes protégées", pages.every(p => lire(p).includes('content="noai, noimageai"')) && /addEventListener\("copy"/.test(lire("assets/page.js")) && /contextmenu/.test(lire("assets/page.js")) && lire("index.html").includes('class="liste protege"'));
const SECRETS = /(AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[0-9A-Za-z]{20,}|sk-[0-9A-Za-z]{20,}|[0-9a-z._%+-]+@(yahoo|gmail|hotmail|outlook)\.[a-z]+)/i;
check("aucun secret ni adresse e-mail privée dans le site", ![...pages, "config.json", "assets/page.js", "assets/annuaire.js", "assets/conf.js"].some(f => SECRETS.test(lire(f))));

check("arabe : aucun élément placé loin hors de l'écran (sinon la page arabe s'affiche blanche sur téléphone)", !/(left|right)\s*:\s*-\d{3,}px/.test(lire("assets/style.css")));
check("doublons : pas deux fiches au même nom à moins de 300 m", (() => {
  const L = fichesPages.map(p => { const m = lire(p).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/); try { return JSON.parse(m[1]); } catch { return null; } }).filter(x => x && x.geo);
  for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
    const A = L[a], B = L[b];
    if (A.name.toLowerCase().trim() !== B.name.toLowerCase().trim()) continue;
    const d = Math.hypot((A.geo.latitude - B.geo.latitude) * 111000, (A.geo.longitude - B.geo.longitude) * 111000 * Math.cos(A.geo.latitude * Math.PI / 180));
    if (d < 300) return false;
  }
  return true; })());

// -- fichiers du site
const man = JSON.parse(lire("manifest.webmanifest"));
check("manifeste : id unique du site, icônes présentes", man.id === BASE && man.icons.every(i => existsSync(join(root, i.src))) && existsSync(join(root, "assets/icons/apple-touch-icon.png")) && existsSync(join(root, "assets/logo.svg")));
const sm = lire("sitemap.xml");
check("plan du site : toutes les pages", pages.every(p => sm.includes(C.url + p.replace(/index\.html$/, ""))));
check("robots.txt : moteurs autorisés, robots d'IA refusés, plan du site", /Allow: \//.test(lire("robots.txt")) && /GPTBot[\s\S]*Disallow: \//.test(lire("robots.txt")) && lire("robots.txt").includes("sitemap.xml"));
check("service worker : portée du site, caches propres au site", /PREFIXE/.test(lire("sw.js")) && /startsWith\(PREFIXE\)/.test(lire("sw.js")));

// -- aucun concurrent cité (empreintes, pour ne pas écrire leurs noms dans un dépôt public)
const INTERDITS = new Set("307804f8a9e7bd48 8b30fe9b5db7797d 04dcb0d6d0e1cf09 41203aefbaa81d72 bcdb95fe1947c378 9637c0327a8cede8 bab1c2c81c93ac98 bcf950015754248a e4a62b35a8e5d6c2 261d1c911c05f428 a60b2df220c8f10e 7a7fa591155e1ddf 0d27b5e9a89a7130 91566e9abbb02832 05f0fa025a3b026b 87838d7d30f0653a 5415e774c52855a1 5835225ddbea8004 e2cbdee30c0107da e907a5ee176e59be".split(" "));
const INTERDITS_DOM = new Set("5d2ae528dda2bff3 e7d3434bfa09866c bac2e4bd95794e67 f8b6c6201a5d83e5 d0b96f4152cb3bef 89209bfe25390a67".split(" "));
const emp = m => createHash("sha256").update(m).digest("hex").slice(0, 16);
const publics = [...pages, "config.json", "README.md", "CLAUDE.md", "assets/page.js", "assets/annuaire.js"].filter(f => existsSync(join(root, f)));
const cites = publics.filter(f => { const s = lire(f).toLowerCase(); return (s.match(/[a-z0-9-]+/g) || []).some(m => INTERDITS.has(emp(m))) || (s.match(/[a-z0-9-]+\.[a-z]{2,4}/g) || []).some(m => INTERDITS_DOM.has(emp(m))); });
check(`aucun nom de concurrent sur le site ni dans le dépôt${cites.length ? " — " + cites.join(", ") : ""}`, !cites.length);

// -- dans un faux navigateur
let JSDOM;
try { ({ JSDOM } = createRequire(import.meta.url)("jsdom")); } catch { try { ({ JSDOM } = await import("jsdom")); } catch { JSDOM = null; } }
if (!JSDOM) { console.log("(jsdom absent : npm install --no-save --no-package-lock jsdom) — tests navigateur sautés"); }
else {
  const ouvrir = async (p, query = "") => {
    const html = lire(p).replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, "");
    const dom = new JSDOM(html, { runScripts: "outside-only", url: C.url + p.replace(/index\.html$/, "") + query });
    const w = dom.window, envois = [];
    w.goatcounter = { count: o => envois.push(o.path) };
    for (const js of ["assets/conf.js", "assets/page.js", "assets/annuaire.js"]) w.eval(lire(js));
    await new Promise(r => setTimeout(r, 50));
    return { w, d: w.document, envois };
  };
  let { w, d } = await ouvrir("index.html");
  check("accueil : en-tête et pied fabriqués (nom du site, crédit OpenStreetMap)", d.getElementById("entete").textContent.includes(C.nom.fr) && /OpenStreetMap/.test(d.getElementById("pied").textContent));
  const visibles = () => [...d.querySelectorAll(".fiche-carte")].filter(c => !c.hidden).length;
  check("accueil : toutes les fiches visibles au départ", visibles() === fichesPages.length);
  const g = attendues[0].gouvernorat;
  d.getElementById("choix-g").value = g; d.getElementById("choix-g").dispatchEvent(new w.Event("change"));
  check("accueil : le filtre par gouvernorat ne garde que ce gouvernorat", visibles() > 0 && [...d.querySelectorAll(".fiche-carte")].filter(c => !c.hidden).every(c => c.dataset.g === g));
  const champ = d.getElementById("recherche"); champ.value = "zzzzqqq"; champ.dispatchEvent(new w.Event("input"));
  check("accueil : recherche sans résultat → message « Aucun résultat »", visibles() === 0 && !d.getElementById("aucun").hidden);
  d.querySelector(".langue").dispatchEvent(new w.Event("click"));
  check("accueil : bouton de langue → arabe, de droite à gauche", d.documentElement.lang === "ar" && d.documentElement.dir === "rtl");
  const fTel = attendues.find(f => f.tel) || attendues[0];
  ({ w, d } = await ouvrir(`fiche/${fTel.id}/index.html`));
  const r = await ouvrir(`fiche/${fTel.id}/index.html`);
  const bouton = r.d.querySelector("[data-clic]");
  if (bouton) { bouton.addEventListener("click", e => e.preventDefault()); bouton.dispatchEvent(new r.w.MouseEvent("click", { bubbles: true })); }
  check("fiche : un clic (appel / WhatsApp / itinéraire) est compté anonymement", !bouton || r.envois.some(e => e === `clic-${bouton.dataset.clic}/${fTel.id}`));
  const ins = await ouvrir("inscription/index.html", `?fiche=${f0.id}&action=retirer`);
  check("professionnels : fiche et action « retirer » pré-remplies depuis le lien d'une fiche", ins.d.getElementById("champ-fiche").value === f0.id && ins.d.querySelector('input[name="action"][value="retirer"]').checked);
}

console.log(ko ? `\n${ko} PROBLÈME(S) sur ${ok + ko} vérifications` : `\nTOUT PASSE (${ok} vérifications)`);
process.exit(ko ? 1 : 0);
