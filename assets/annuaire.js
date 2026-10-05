/* Moteur d'annuaire — recherche et filtres, formulaires (envoi au clic), statistiques anonymes des clics.
   Statistiques : GoatCounter compte « clic-<type>/<fiche> » (appel, WhatsApp, itinéraire) : c'est ce qui permettra
   de montrer à un professionnel combien de clients l'ont contacté. Jamais de donnée personnelle. */
const sansAccent = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[إأآا]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
const compter = (path, title) => { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path, title, event: true }); } catch (e) {} };

/* --- recherche et filtres --- */
document.addEventListener("DOMContentLoaded", () => {
  const liste = document.getElementById("liste");
  if (!liste) return;
  const cartes = [...liste.querySelectorAll(".fiche-carte")];
  const champ = document.getElementById("recherche"), choixG = document.getElementById("choix-g"), compte = document.getElementById("compte");
  let metier = "";
  const depart = new URLSearchParams(location.search);
  if (choixG && depart.get("g")) choixG.value = depart.get("g");
  function filtrer() {
    const mots = sansAccent(champ ? champ.value.trim() : "").split(/\s+/).filter(Boolean);
    const g = choixG ? choixG.value : "";
    let n = 0;
    for (const c of cartes) {
      const ok = (!g || c.dataset.g === g) && (!metier || c.dataset.m === metier) && mots.every(m => sansAccent(c.dataset.cherche).includes(m));
      c.hidden = !ok; if (ok) n++;
    }
    const vide = document.getElementById("aucun"); if (vide) vide.hidden = n > 0;
    if (compte) compte.textContent = T(`${n} résultat${n > 1 ? "s" : ""}`, `${n} نتيجة`);
  }
  if (champ) champ.addEventListener("input", filtrer);
  if (choixG) choixG.addEventListener("change", filtrer);
  document.querySelectorAll(".puce").forEach(b => b.addEventListener("click", () => {
    metier = metier === b.dataset.m ? "" : b.dataset.m;
    document.querySelectorAll(".puce").forEach(x => x.classList.toggle("on", x.dataset.m === metier));
    filtrer();
  }));
  const ph = () => { if (champ) champ.placeholder = T("Nom, ville, quartier…", "الاسم، المدينة، الحي…"); filtrer(); };
  document.addEventListener("langue", ph); ph();
});

/* --- statistiques des clics sur une fiche --- */
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest("[data-clic]");
  if (!a) return;
  const fiche = a.closest("[data-fiche]");
  if (fiche) compter(`clic-${a.dataset.clic}/${fiche.dataset.fiche}`, `Clic ${a.dataset.clic} : ${document.title.split(" — ")[0]}`);
});

/* --- page Professionnels : fiche et action pré-remplies depuis le lien d'une fiche --- */
document.addEventListener("DOMContentLoaded", () => {
  const champ = document.getElementById("champ-fiche");
  if (!champ) return;
  const q = new URLSearchParams(location.search), id = (q.get("fiche") || "").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
  const action = q.get("action");
  if (id) { champ.value = id; const p = document.getElementById("fiche-choisie"); p.hidden = false; p.textContent = T("Fiche concernée : ", "البطاقة المعنية: ") + id; }
  const r = document.querySelector(`input[name="action"][value="${action === "retirer" ? "retirer" : action === "corriger" ? "corriger" : "ajouter"}"]`);
  if (r) r.checked = true;
});

/* --- formulaires : envoi au clic seulement (Formspree), message clair --- */
document.addEventListener("submit", async e => {
  const f = e.target.closest && e.target.closest("form[data-envoi]");
  if (!f) return;
  e.preventDefault();
  const statut = f.querySelector(".statut"), bouton = f.querySelector("button[type=submit]");
  if (f._gotcha && f._gotcha.value) return;
  bouton.disabled = true; statut.textContent = T("Envoi…", "جارٍ الإرسال…");
  try {
    const rep = await fetch(f.action, { method: "POST", body: new FormData(f), headers: { Accept: "application/json" } });
    if (!rep.ok) throw new Error(rep.status);
    f.reset(); statut.textContent = T("Merci, c'est envoyé. Nous lisons chaque message.", "شكرًا، تم الإرسال. نقرأ كل رسالة.");
    compter(`envoi-${f.dataset.envoi}`, `Formulaire ${f.dataset.envoi} envoyé`);
  } catch (err) {
    statut.textContent = T("Envoi impossible pour l'instant. Réessayez plus tard.", "تعذّر الإرسال حاليًا. أعد المحاولة لاحقًا.");
  } finally { bouton.disabled = false; }
});
