// Moteur d'annuaire commun : fabrique toutes les pages du site à partir de config.json et des fiches.
//   node tools/construire.mjs        (depuis le dossier du site)
// Fiches : donnees/osm.json (robot OpenStreetMap) + donnees/inscrits.json (inscriptions vérifiées, plus tard)
//          moins donnees/retraits.json (fiches retirées à la demande : jamais republiées).
// Ne pas modifier les pages à la main : modifier ce fichier (dans annuaires/moteur/) puis `python synchroniser.py`.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createHash } from "crypto";
import { TN_CONTOUR, TN_DJERBA, TN_POS } from "./carte_tunisie.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lire = (f, defaut) => existsSync(join(root, f)) ? JSON.parse(readFileSync(join(root, f), "utf8")) : defaut;
const C = lire("config.json");
const URL_SITE = C.url;
const BASE = new URL(URL_SITE).pathname;                     // ex. /auto-ecoles-tunisie/

export const GOUVERNORATS = [
  ["ariana", "Ariana", "أريانة"], ["beja", "Béja", "باجة"], ["ben-arous", "Ben Arous", "بن عروس"], ["bizerte", "Bizerte", "بنزرت"],
  ["gabes", "Gabès", "قابس"], ["gafsa", "Gafsa", "قفصة"], ["jendouba", "Jendouba", "جندوبة"], ["kairouan", "Kairouan", "القيروان"],
  ["kasserine", "Kasserine", "القصرين"], ["kebili", "Kébili", "قبلي"], ["le-kef", "Le Kef", "الكاف"], ["mahdia", "Mahdia", "المهدية"],
  ["la-manouba", "La Manouba", "منوبة"], ["medenine", "Médenine", "مدنين"], ["monastir", "Monastir", "المنستير"], ["nabeul", "Nabeul", "نابل"],
  ["sfax", "Sfax", "صفاقس"], ["sidi-bouzid", "Sidi Bouzid", "سيدي بوزيد"], ["siliana", "Siliana", "سليانة"], ["sousse", "Sousse", "سوسة"],
  ["tataouine", "Tataouine", "تطاوين"], ["tozeur", "Tozeur", "توزر"], ["tunis", "Tunis", "تونس"], ["zaghouan", "Zaghouan", "زغوان"],
];
const G = Object.fromEntries(GOUVERNORATS.map(g => [g[0], g]));
const M = Object.fromEntries(C.metiers.map(m => [m.id, m]));

/* ---------------- fiches ---------------- */
const retraits = new Set(lire("donnees/retraits.json", { ids: [] }).ids || []);
const toutes = [...(lire("donnees/osm.json", { fiches: [] }).fiches || []), ...(lire("donnees/manuels.json", { fiches: [] }).fiches || []), ...(lire("donnees/inscrits.json", { fiches: [] }).fiches || [])]
  .filter(f => f && f.id && f.nom && G[f.gouvernorat] && M[f.metier] && !retraits.has(f.id));
// doublons : même identifiant, ou même nom (sans accents ni casse) à moins de 300 m (point et bâtiment du même lieu dans OSM)
const vus = new Set(), gardees = [];
const nomN = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();
const distM = (a, b) => Math.hypot((a.lat - b.lat) * 111000, (a.lon - b.lon) * 111000 * Math.cos(a.lat * Math.PI / 180));
for (const f of toutes) {
  if (vus.has(f.id)) continue;
  const double = gardees.find(g => nomN(g.nom) === nomN(f.nom) && g.lat && f.lat && distM(g, f) < 300);
  if (double) { for (const k of ["tel", "site", "horaires", "adresse", "ville", "nom_ar"]) if (!double[k] && f[k]) double[k] = f[k]; continue; }
  vus.add(f.id); gardees.push(f);
}
export const FICHES = gardees
  .sort((a, b) => (b.pro ? 1 : 0) - (a.pro ? 1 : 0) || a.nom.localeCompare(b.nom, "fr"));

/* ---------------- outils ---------------- */
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const bi = (fr, ar) => `<span data-l="fr">${fr}</span><span data-l="ar">${ar}</span>`;
const biO = o => bi(esc(o.fr), esc(o.ar));
const ISO = t => "⁦" + t + "⁩";
const telLisible = t => t ? t.replace(/(\d{2})(\d{3})(\d{3})/, "$1 $2 $3") : "";
const mobile = t => !!t && /^[2459]/.test(t);                   // portables tunisiens : 2x, 4x, 5x, 9x
const V = createHash("sha256").update(["assets/style.css", "assets/page.js", "assets/annuaire.js", "assets/avis.js"]
  .map(f => existsSync(join(root, f)) ? readFileSync(join(root, f), "utf8") : "").join("") + JSON.stringify(C)).digest("hex").slice(0, 10);
const CSP = `default-src 'self'; script-src 'self' https://gc.zgo.at; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: ${C.goatcounter}; connect-src 'self' ${C.goatcounter} https://formspree.io; object-src 'none'; base-uri 'self'; form-action 'self' https://formspree.io; upgrade-insecure-requests`;
const ICO = {
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 19z"/><path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1-1.5 2 1-.5 1.5c-3 0-7-4-7-7l1.5-.5 1 2z"/>',
  carte: '<path d="M12 21s-7-6.3-7-11.5a7 7 0 0 1 14 0C19 14.7 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  heure: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  loupe: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
  retirer: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  crayon: '<path d="M4 20h4L20 8l-4-4L4 16z"/>',
  ok: '<path d="M5 12l5 5 9-10"/>',
};
const svg = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[n]}</svg>`;
const imgMetier = (m, racine, taille = 40) => `<img class="ill-metier" src="${racine}assets/metiers/${m.id}.svg" alt="" width="${taille}" height="${taille}">`;
// photo du bandeau (Wikimedia, licence libre) et son crédit : obligatoires (checklist visuelle)
const P = C.photo;
const creditPhoto = () => P ? `<p class="credit">${bi("Photo", "صورة")} : <bdi>${esc(P.auteur)}</bdi>, <a href="${esc(P.licence_url)}" rel="noopener license">${esc(P.licence)}</a>, <a href="${esc(P.source)}" rel="noopener">Wikimedia Commons</a></p>` : "";

function tete({ titre, desc, chemin, racine, jsonld = [] }) {
  return `<!doctype html>
<html translate="no" lang="fr" dir="ltr" data-racine="${racine}" data-base="${BASE}">
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="robots" content="noai, noimageai">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${URL_SITE}${chemin}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(C.nom.fr)}">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${URL_SITE}${chemin}">
<meta property="og:locale" content="fr_TN"><meta property="og:locale:alternate" content="ar_TN">
${C.og_image ? `<meta property="og:image" content="${URL_SITE}assets/${C.og_image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">` : ""}
<link rel="icon" href="${racine}assets/logo.svg" type="image/svg+xml">
<link rel="manifest" href="${racine}manifest.webmanifest">
<link rel="apple-touch-icon" href="${racine}assets/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${esc(C.court.fr)}">
<meta name="theme-color" content="${C.couleur}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&amp;family=Noto+Kufi+Arabic:wght@400;600;700;800&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="${racine}assets/style.css?v=${V}">
<link rel="stylesheet" href="${racine}assets/couleurs.css?v=${V}">
<script defer src="${racine}assets/conf.js?v=${V}"></script>
<script defer src="${racine}assets/page.js?v=${V}"></script>
<script defer src="${racine}assets/annuaire.js?v=${V}"></script>
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n")}
<script data-goatcounter="${C.goatcounter}/count" async src="https://gc.zgo.at/count.js"></script>
</head>
<body>
<header class="entete" id="entete"></header>`;
}
const pied = `<footer id="pied"></footer>\n</body>\n</html>\n`;
const fil = (racine, ...etapes) => `<p class="fil"><a href="${racine || "./"}">${bi("Accueil", "الرئيسية")}</a>${etapes.map(e => " › " + e).join("")}</p>`;

function carte(f, racine) {
  const g = G[f.gouvernorat], m = M[f.metier];
  const cherche = [f.nom, f.nom_ar, f.ville, f.adresse, g[1], g[2], m.fr, m.ar, m.mots].filter(Boolean).join(" ");
  return `<a class="fiche-carte${f.pro ? " pro" : ""}" href="${racine}fiche/${f.id}/" data-cherche="${esc(cherche)}" data-g="${f.gouvernorat}" data-m="${f.metier}">
  ${imgMetier(m, racine, 34)}
  <span class="fc-nom">${esc(f.nom)}${f.nom_ar ? ` <span class="fc-ar" lang="ar">${esc(f.nom_ar)}</span>` : ""}</span>
  <span class="fc-lieu">${svg("carte")}${[f.ville, null].filter(Boolean).map(esc).join("")}${f.ville ? " · " : ""}${bi(esc(g[1]), esc(g[2]))}</span>
  ${C.metiers.length > 1 ? `<span class="fc-metier">${biO({ fr: m.fr, ar: m.ar })}</span>` : ""}
  ${f.tel ? `<span class="fc-tel">${svg("tel")}<bdi dir="ltr">${telLisible(f.tel)}</bdi></span>` : ""}
</a>`;
}

function filtres(racine, gouvernoratFixe) {
  return `<div class="filtres" id="filtres">
  <label class="recherche">${svg("loupe")}<input type="search" id="recherche" autocomplete="off" aria-label="Rechercher"></label>
  ${gouvernoratFixe ? "" : `<select id="choix-g" aria-label="Gouvernorat"><option value="">${esc("Tous les gouvernorats")}</option>${GOUVERNORATS.map(g => `<option value="${g[0]}" data-ar="${esc(g[2])}">${esc(g[1])}</option>`).join("")}</select>`}
  ${C.metiers.length > 1 ? `<div class="puces">${C.metiers.map(m => `<button type="button" class="puce" data-m="${m.id}">${imgMetier(m, racine, 22)}${biO({ fr: m.fr_pl, ar: m.ar_pl })}</button>`).join("")}</div>` : ""}
</div>
<p class="compte" id="compte" aria-live="polite"></p>`;
}

const blocPro = racine => `<section class="carte pro-appel">
  <h2>${bi("Vous êtes un professionnel ?", "هل أنت مهني؟")}</h2>
  <p>${bi("Votre fiche manque, contient une erreur, ou vous voulez la retirer ? Dites-le-nous : c'est gratuit.", "بطاقتك غير موجودة أو فيها خطأ أو تريد حذفها؟ أعلمنا بذلك: الخدمة مجانية.")}</p>
  <a class="btn" href="${racine}inscription/">${svg("crayon")}${bi("Ajouter, corriger ou retirer une fiche", "إضافة بطاقة أو تصحيحها أو حذفها")}</a>
</section>`;

const liensAmis = () => C.liens && C.liens.length ? `<section class="carte liens-amis">${C.liens.map(l => `<a href="${esc(l.url)}">${biO(l)} →</a>`).join("")}</section>` : "";

const AVIS = `<section class="carte avis" id="avis">
  <h2>${bi("Votre avis", "رأيك يهمّنا")}</h2>
  <p>${bi("Une remarque, une erreur, une idée ? Écrivez-nous : chaque message est lu.", "ملاحظة، خطأ، فكرة؟ اكتب لنا: كل رسالة تُقرأ.")}</p>
  <form class="formulaire" data-envoi="avis" action="${C.formspree}" method="POST">
    <label for="avis-message">${bi("Votre message", "رسالتك")}</label>
    <textarea id="avis-message" name="message" required maxlength="1000" rows="4"></textarea>
    <label for="avis-email">${bi("Votre e-mail (facultatif, pour vous répondre)", "بريدك الإلكتروني (اختياري، للرد عليك)")}</label>
    <input type="email" id="avis-email" name="email" maxlength="200" autocomplete="email">
    <input type="hidden" name="site" value="${esc(C.nom.fr)}"><input type="hidden" name="_subject" value="Avis — ${esc(C.nom.fr)}">
    <input type="text" name="_gotcha" class="piege" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button type="submit" class="btn">${bi("Envoyer", "إرسال")}</button>
    <p class="statut" role="status" aria-live="polite"></p>
  </form>
</section>`;

/* Carte de la Tunisie : une bulle par gouvernorat (taille selon le nombre de fiches), cliquable ; « actif » = gouvernorat de la page.
   Règle d'Ahmed (05/10/2026) : chaque moteur de recherche par gouvernorat a cette carte. */
function carteTunisie(racine, comptes, actif = "") {
  const bulles = GOUVERNORATS.map(([slug, fr, ar]) => {
    const [x, y] = TN_POS[slug], n = comptes[slug] || 0;
    const r = n ? Math.round(Math.min(18, 7.5 + 2.2 * Math.sqrt(n)) * 10) / 10 : 5;
    return `<a href="${racine}gouvernorat/${slug}/" class="tn-b${n ? "" : " vide"}${slug === actif ? " actif" : ""}" data-gouv="${slug}"><title>${esc(fr)} · ${esc(ar)} : ${n}</title><circle cx="${x}" cy="${y}" r="${slug === actif ? Math.max(r, 11) : r}"/>${n ? `<text x="${x}" y="${y}">${n}</text>` : ""}</a>`;
  }).join("");
  return `<svg class="carte-tn" viewBox="0 0 232 462" role="img" aria-label="Carte de la Tunisie par gouvernorat"><path class="tn-terre" d="${TN_CONTOUR}"/><ellipse class="tn-terre" cx="${TN_DJERBA[0]}" cy="${TN_DJERBA[1]}" rx="9" ry="6.5"/>${bulles}</svg>`;
}

/* ---------------- pages ---------------- */
const pages = {};
const compteG = Object.fromEntries(GOUVERNORATS.map(g => [g[0], FICHES.filter(f => f.gouvernorat === g[0]).length]));
const metierPl = C.metiers.length === 1 ? C.metiers[0] : { fr_pl: "professionnels", ar_pl: "مهنيين" };

// accueil
{
  const ld = [{ "@context": "https://schema.org", "@type": "WebSite", name: C.nom.fr, url: URL_SITE, inLanguage: ["fr", "ar"] }];
  pages[""] = tete({ titre: `${C.titre_accueil.fr} | ${C.nom.fr}`, desc: C.description, chemin: "", racine: "", jsonld: ld }) + `
<section class="hero hero-accueil">${P ? `<img class="hero-fond" src="${esc(P.fichier)}" alt="" width="${P.largeur}" height="${P.hauteur}">` : ""}<div class="wrap">
  <div class="hero-texte">
  <h1>${biO(C.titre_accueil)}</h1>
  <p class="intro">${biO(C.intro)}</p>
  <p class="chiffre">${bi(`${FICHES.length} ${esc(metierPl.fr_pl.toLowerCase())} dans ${Object.values(compteG).filter(Boolean).length} gouvernorats`, `${ISO(FICHES.length)} ${esc(metierPl.ar_pl)} في ${ISO(Object.values(compteG).filter(Boolean).length)} ولاية`)}</p>
  </div>
  <figure class="hero-carte">${carteTunisie("", compteG)}<figcaption>${bi("Touchez un gouvernorat", "اضغط على ولاية")}</figcaption></figure>
</div>${P ? `<div class="wrap">${creditPhoto()}</div>` : ""}</section>
<main class="wrap">
  ${C.metiers.length > 1 ? `<div class="metiers">${C.metiers.map(m => `<a class="metier" href="#liste" data-m="${m.id}">${imgMetier(m, "", 44)}<span>${biO({ fr: m.fr_pl, ar: m.ar_pl })}</span><span class="n">${FICHES.filter(f => f.metier === m.id).length}</span></a>`).join("")}</div>` : ""}
  ${filtres("", false)}
  <div class="liste protege" id="liste">${FICHES.map(f => carte(f, "")).join("\n")}</div>
  <p class="vide" id="aucun" hidden>${bi("Aucun résultat. Essayez un autre mot ou un autre gouvernorat.", "لا توجد نتيجة. جرّب كلمة أو ولاية أخرى.")}</p>
  <h2 class="titre-section">${bi("Par gouvernorat", "حسب الولاية")}</h2>
  <section class="carte">
    <div class="gouvernorats">${GOUVERNORATS.map(g => `<a href="gouvernorat/${g[0]}/">${bi(esc(g[1]), esc(g[2]))}<span class="n">${compteG[g[0]]}</span></a>`).join("")}</div>
  </section>
  ${blocPro("")}
  ${liensAmis()}
  ${AVIS}
</main>
` + pied;
}

// une page par gouvernorat
for (const [slug, fr, ar] of GOUVERNORATS) {
  const liste = FICHES.filter(f => f.gouvernorat === slug);
  const titre = `${metierPl.fr_pl} à ${fr} (${liste.length}) — adresse et téléphone, gratuit | ${C.nom.fr}`;
  pages[`gouvernorat/${slug}/`] = tete({ titre, desc: `${metierPl.fr_pl} dans le gouvernorat de ${fr} : adresse, téléphone, WhatsApp et itinéraire. Annuaire gratuit en français et en arabe. ${metierPl.ar_pl} في ولاية ${ar}.`, chemin: `gouvernorat/${slug}/`, racine: "../../" }) + `
<section class="hero hero-accueil"><div class="wrap">
  <div class="hero-texte">
  ${fil("../../", bi(esc(fr), esc(ar)))}
  <h1>${bi(`${esc(metierPl.fr_pl)} à ${esc(fr)}`, `${esc(metierPl.ar_pl)} في ولاية ${esc(ar)}`)}</h1>
  <p class="intro">${bi(`${liste.length} fiche(s), triées par nom. Annuaire gratuit.`, `${ISO(liste.length)} بطاقة، مرتبة حسب الاسم. دليل مجاني.`)}</p>
  </div>
  <figure class="hero-carte petite">${carteTunisie("../../", compteG, slug)}<figcaption>${bi("Autres gouvernorats : touchez la carte", "ولايات أخرى: اضغط على الخريطة")}</figcaption></figure>
</div></section>
<main class="wrap">
  ${liste.length ? filtres("../../", true) + `<div class="liste protege" id="liste">${liste.map(f => carte(f, "../../")).join("\n")}</div><p class="vide" id="aucun" hidden>${bi("Aucun résultat.", "لا توجد نتيجة.")}</p>`
    : `<section class="carte appel-vide"><h2>${bi(`Soyez parmi les premiers à ${esc(fr)}`, `كن من الأوائل في ${esc(ar)}`)}</h2><p>${bi(`Aucune fiche pour l'instant dans le gouvernorat de ${esc(fr)}. Vous êtes un professionnel ici, ou vous en connaissez un ? L'ajout est gratuit.`, `لا توجد بطاقة حاليًا في ولاية ${esc(ar)}. هل أنت مهني هنا أو تعرف مهنيًا؟ الإضافة مجانية.`)}</p><a class="btn" href="../../inscription/">${bi("Ajouter une fiche gratuitement", "أضف بطاقة مجانًا")}</a></section>`}
  <section class="carte">
    <h2>${bi("Autres gouvernorats", "ولايات أخرى")}</h2>
    <div class="gouvernorats">${GOUVERNORATS.filter(g => g[0] !== slug).map(g => `<a href="../../gouvernorat/${g[0]}/">${bi(esc(g[1]), esc(g[2]))}<span class="n">${compteG[g[0]]}</span></a>`).join("")}</div>
  </section>
  ${blocPro("../../")}
  ${liensAmis()}
</main>
` + pied;
}

// une page par fiche
for (const f of FICHES) {
  const g = G[f.gouvernorat], m = M[f.metier];
  const ld = { "@context": "https://schema.org", "@type": C.schema || "LocalBusiness", name: f.nom, url: `${URL_SITE}fiche/${f.id}/`,
    address: { "@type": "PostalAddress", addressLocality: f.ville || g[1], addressRegion: g[1], addressCountry: "TN", ...(f.adresse ? { streetAddress: f.adresse } : {}) },
    ...(f.tel ? { telephone: "+216" + f.tel } : {}), ...(f.lat ? { geo: { "@type": "GeoCoordinates", latitude: f.lat, longitude: f.lon } } : {}) };
  const itin = f.lat ? `https://www.openstreetmap.org/directions?to=${f.lat}%2C${f.lon}#map=17/${f.lat}/${f.lon}` : null;
  const titre = `${f.nom} — ${m.fr} à ${f.ville || g[1]} : téléphone, adresse | ${C.nom.fr}`;
  pages[`fiche/${f.id}/`] = tete({ titre, desc: `${f.nom}, ${m.fr.toLowerCase()} à ${f.ville || g[1]} (gouvernorat de ${g[1]}) : ${f.tel ? "téléphone, " : ""}adresse et itinéraire. Annuaire gratuit.`, chemin: `fiche/${f.id}/`, racine: "../../", jsonld: [ld] }) + `
<section class="hero"><div class="wrap">
  ${fil("../../", `<a href="../../gouvernorat/${g[0]}/">${bi(esc(g[1]), esc(g[2]))}</a>`)}
  <h1 class="titre-fiche">${imgMetier(m, "../../", 48)}<span>${esc(f.nom)}</span></h1>
  ${f.nom_ar ? `<p class="nom-ar" lang="ar" dir="rtl">${esc(f.nom_ar)}</p>` : ""}
  <p class="intro">${biO({ fr: m.fr, ar: m.ar })} · ${f.ville ? esc(f.ville) + " · " : ""}${bi(esc(g[1]), esc(g[2]))}</p>
</div></section>
<main class="wrap">
  <section class="carte fiche" data-fiche="${f.id}">
    <div class="actions">
      ${f.tel ? `<a class="btn" href="tel:+216${f.tel}" data-clic="tel">${svg("tel")}${bi("Appeler", "اتصال")} <bdi dir="ltr">${telLisible(f.tel)}</bdi></a>` : ""}
      ${mobile(f.tel) ? `<a class="btn vert" href="https://wa.me/216${f.tel}" rel="noopener" data-clic="whatsapp">${svg("wa")}WhatsApp</a>` : ""}
      ${itin ? `<a class="btn clair" href="${itin}" rel="noopener" data-clic="itineraire">${svg("carte")}${bi("Itinéraire", "الطريق")}</a>` : ""}
    </div>
    <dl class="infos">
      ${f.adresse ? `<dt>${bi("Adresse", "العنوان")}</dt><dd>${esc(f.adresse)}${f.ville ? ", " + esc(f.ville) : ""}</dd>` : ""}
      <dt>${bi("Gouvernorat", "الولاية")}</dt><dd>${bi(esc(g[1]), esc(g[2]))}</dd>
      ${f.horaires ? `<dt>${bi("Horaires", "التوقيت")}</dt><dd><bdi dir="ltr">${esc(f.horaires)}</bdi></dd>` : ""}
      ${f.site ? `<dt>${bi("Site", "الموقع")}</dt><dd><a href="${esc(f.site)}" rel="noopener nofollow">${esc(f.site.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a></dd>` : ""}
      ${!f.tel ? `<dt>${bi("Téléphone", "الهاتف")}</dt><dd>${bi("non renseigné", "غير متوفر")}</dd>` : ""}
    </dl>
    <p class="source">${f.source === "web" ? bi(`Informations publiées par l'établissement lui-même sur <a href="${esc(f.source_url)}" rel="noopener nofollow">sa page publique</a> (relevées le ${esc(f.releve || "")}), non vérifiées par nous.`, `معلومات نشرتها المؤسسة بنفسها على <a href="${esc(f.source_url)}" rel="noopener nofollow">صفحتها العامة</a> (بتاريخ ${esc(f.releve || "")})، لم نتحقق منها.`) : f.source === "osm" ? bi(`Informations publiques issues d'<a href="${f.osm}" rel="noopener">OpenStreetMap</a> (© les contributeurs d'OpenStreetMap, licence ODbL), non vérifiées par l'établissement.`, `معلومات عامة مأخوذة من <a href="${f.osm}" rel="noopener">OpenStreetMap</a> (© المساهمون في OpenStreetMap، رخصة ODbL)، لم تتحقق منها المؤسسة.`) : bi("Fiche remplie par l'établissement et vérifiée.", "بطاقة عمّرتها المؤسسة وتم التثبت منها.")}</p>
    <div class="actions petites">
      <a href="../../inscription/?fiche=${f.id}&amp;action=corriger">${svg("crayon")}${bi("C'est votre établissement ? Compléter ou corriger", "هذه مؤسستك؟ أكمل البطاقة أو صحّحها")}</a>
      <a href="../../inscription/?fiche=${f.id}&amp;action=retirer">${svg("retirer")}${bi("Retirer cette fiche", "حذف هذه البطاقة")}</a>
    </div>
  </section>
  ${liensAmis()}
</main>
` + pied;
}

// inscription / correction / retrait
pages["inscription/"] = tete({ titre: `Ajouter, corriger ou retirer une fiche — gratuit | ${C.nom.fr}`, desc: `Professionnel : ajoutez, corrigez ou retirez gratuitement votre fiche sur ${C.nom.fr}.`, chemin: "inscription/", racine: "../" }) + `
<section class="hero"><div class="wrap">
  ${fil("../", bi("Professionnels", "المهنيون"))}
  <h1>${bi("Ajouter, corriger ou retirer une fiche", "إضافة بطاقة أو تصحيحها أو حذفها")}</h1>
  <p class="intro">${bi("Gratuit. Nous traitons chaque demande, en général sous quelques jours.", "مجاني. نعالج كل طلب، عادة في غضون أيام قليلة.")}</p>
</div></section>
<main class="wrap">
  ${C.inscriptions_ouvertes ? "" : `<p class="note">${bi("Les inscriptions complètes (photos, prix, horaires) ouvriront bientôt. En attendant, vous pouvez déjà demander l'ajout, la correction ou le retrait d'une fiche.", "التسجيل الكامل (صور، أسعار، توقيت) سيُفتح قريبًا. في الأثناء يمكنك طلب إضافة بطاقة أو تصحيحها أو حذفها.")}</p>`}
  <section class="carte">
    <form class="formulaire" data-envoi="demande" action="${C.formspree}" method="POST">
      <fieldset class="choix-action">
        <legend>${bi("Votre demande", "طلبك")}</legend>
        <label><input type="radio" name="action" value="ajouter" checked> ${bi("Ajouter une fiche", "إضافة بطاقة")}</label>
        <label><input type="radio" name="action" value="corriger"> ${bi("Corriger une fiche", "تصحيح بطاقة")}</label>
        <label><input type="radio" name="action" value="retirer"> ${bi("Retirer une fiche", "حذف بطاقة")}</label>
      </fieldset>
      <input type="hidden" name="fiche" id="champ-fiche" value="">
      <p class="fiche-choisie" id="fiche-choisie" hidden></p>
      <label for="d-nom">${bi("Nom de l'établissement", "اسم المؤسسة")}</label>
      <input id="d-nom" name="etablissement" required maxlength="120">
      <label for="d-g">${bi("Gouvernorat", "الولاية")}</label>
      <select id="d-g" name="gouvernorat">${GOUVERNORATS.map(g => `<option value="${g[1]}" data-ar="${esc(g[2])}">${esc(g[1])}</option>`).join("")}</select>
      <label for="d-message">${bi("Votre demande en quelques mots (adresse, téléphone, correction…)", "طلبك في بضع كلمات (العنوان، الهاتف، التصحيح…)")}</label>
      <textarea id="d-message" name="message" required maxlength="1000" rows="4"></textarea>
      <label for="d-contact">${bi("Votre téléphone ou e-mail, pour vérifier la demande", "هاتفك أو بريدك الإلكتروني للتثبت من الطلب")}</label>
      <input id="d-contact" name="contact" required maxlength="120">
      <input type="hidden" name="site" value="${esc(C.nom.fr)}"><input type="hidden" name="_subject" value="Demande de fiche — ${esc(C.nom.fr)}">
      <input type="text" name="_gotcha" class="piege" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button type="submit" class="btn">${bi("Envoyer la demande", "إرسال الطلب")}</button>
      <p class="statut" role="status" aria-live="polite"></p>
      <p class="mention">${bi("Vos coordonnées servent seulement à vérifier la demande ; elles ne sont pas publiées sans votre accord. Un retrait demandé est définitif.", "تُستعمل بياناتك للتثبت من الطلب فقط ولا تُنشر دون موافقتك. الحذف المطلوب نهائي.")}</p>
    </form>
  </section>
</main>
` + pied;

// à propos
pages["a-propos/"] = tete({ titre: `À propos et sources | ${C.nom.fr}`, desc: `D'où viennent les fiches de ${C.nom.fr} (OpenStreetMap, demandes des professionnels), données personnelles et retrait.`, chemin: "a-propos/", racine: "../" }) + `
<section class="hero"><div class="wrap">${fil("../", bi("À propos", "من نحن"))}<h1>${bi("À propos et sources", "من نحن والمصادر")}</h1></div></section>
<main class="wrap"><section class="carte texte">
  <h2>${bi("D'où viennent les fiches ?", "من أين تأتي البطاقات؟")}</h2>
  <p>${bi(`Les fiches viennent de la carte libre <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> (© les contributeurs d'OpenStreetMap, licence ODbL), mise à jour chaque nuit, et des demandes des professionnels eux-mêmes. Les fiches OpenStreetMap ne sont pas vérifiées par les établissements : appelez avant de vous déplacer.`, `تأتي البطاقات من الخريطة الحرة <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> (© المساهمون في OpenStreetMap، رخصة ODbL) التي تُحيَّن كل ليلة، ومن طلبات المهنيين أنفسهم. بطاقات OpenStreetMap لم تتحقق منها المؤسسات: اتصل قبل التنقل.`)}</p>
  <h2>${bi("Site gratuit et non officiel", "موقع مجاني وغير رسمي")}</h2>
  <p>${bi("Ce site n'est lié à aucune administration ni organisation professionnelle. La consultation est gratuite et sans inscription.", "هذا الموقع غير مرتبط بأي إدارة أو هيكل مهني. التصفح مجاني ودون تسجيل.")}</p>
  <h2>${bi("Données personnelles et retrait", "المعطيات الشخصية والحذف")}</h2>
  <p>${bi(`Nous ne publions que des informations professionnelles déjà publiques ou données par l'établissement. Tout établissement peut demander la correction ou le retrait de sa fiche depuis la page <a href="../inscription/">Professionnels</a> ; un retrait est définitif. Statistiques de visite anonymes, sans cookies (GoatCounter).`, `لا ننشر إلا معلومات مهنية منشورة سابقًا أو قدّمتها المؤسسة. يمكن لكل مؤسسة طلب تصحيح بطاقتها أو حذفها من صفحة <a href="../inscription/">المهنيون</a>؛ والحذف نهائي. إحصائيات زيارة مجهولة دون ملفات تعريف الارتباط (GoatCounter).`)}</p>
</section></main>
` + pied;

/* ---------------- écriture ---------------- */
// on efface les anciennes pages de fiches (une fiche retirée ne doit plus exister)
for (const dossier of ["fiche", "gouvernorat"]) if (existsSync(join(root, dossier))) rmSync(join(root, dossier), { recursive: true, force: true });
for (const [chemin, html] of Object.entries(pages)) {
  const d = join(root, chemin); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "index.html"), html, "utf8");
}
// conf.js (lu par page.js : pas de script dans les pages, la CSP l'interdit)
writeFileSync(join(root, "assets", "conf.js"), `/* FABRIQUÉ par tools/construire.mjs à partir de config.json — ne pas modifier */
window.CONF = ${JSON.stringify({ nom: C.nom, sous_titre: C.sous_titre, base: BASE, liens: C.liens || [], gouvernorats: GOUVERNORATS })};
`, "utf8");
writeFileSync(join(root, "assets", "couleurs.css"), `/* FABRIQUÉ par tools/construire.mjs à partir de config.json */
:root{--p:${C.couleur};--p-fonce:${C.couleur_fonce};--p-clair:${C.couleur_claire}}
`, "utf8");
writeFileSync(join(root, "manifest.webmanifest"), JSON.stringify({ id: BASE, name: C.nom.fr, short_name: C.court.fr, description: C.description,
  start_url: "./", scope: "./", display: "standalone", lang: "fr", dir: "auto", theme_color: C.couleur, background_color: "#F4F7FA",
  icons: [{ src: "assets/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "assets/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "assets/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] }, null, 2) + "\n", "utf8");
writeFileSync(join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.keys(pages).map(p => `  <url><loc>${URL_SITE}${p}</loc></url>`).join("\n")}
</urlset>
`, "utf8");
writeFileSync(join(root, "robots.txt"), `User-agent: *
Allow: /
Sitemap: ${URL_SITE}sitemap.xml

# Robots d'intelligence artificielle et aspirateurs : non
${["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "CCBot", "Google-Extended", "Applebot-Extended", "PerplexityBot", "Bytespider", "Amazonbot", "Meta-ExternalAgent", "FacebookBot", "Diffbot", "Omgilibot", "cohere-ai", "ImagesiftBot", "HTTrack", "WebCopier", "WebZIP", "Offline Explorer", "wget", "SiteSnagger"].map(b => `User-agent: ${b}\nDisallow: /`).join("\n\n")}
`, "utf8");
console.log(`${Object.keys(pages).length} pages (${FICHES.length} fiches, ${retraits.size} retirée(s)), version ${V}`);
