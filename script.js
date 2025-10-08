const ecranDebut = document.getElementById('ecran-debut');
const ecranFin = document.getElementById('ecran-fin');
const zoneJeu = document.getElementById('zone-jeu');
const tasse = document.getElementById('tasse');
const scoreAffiche = document.getElementById('score');
const viesAffiche = document.getElementById('vies');
const timerAffiche = document.getElementById('timer');
const scoreFinalAffiche = document.getElementById('score-final');
const tempsFinalAffiche = document.getElementById('temps-final');
const boutonStart = document.getElementById('bouton-start');
const boutonRecommencer = document.getElementById('bouton-recommencer');
const formulaireScore = document.getElementById('formulaire-score');
const listeScoresDebut = document.getElementById('liste-scores-debut');
const listeScoresFin = document.getElementById('liste-scores-fin');
const limiteBasse = document.getElementById('limite-basse');

const boutonGaucheMobile = document.getElementById('bouton-gauche');
const boutonDroiteMobile = document.getElementById('bouton-droite');

const db = firebase.firestore();

const HAUTEUR_JEU_MAX = 900;
const HAUTEUR_MINIMALE_BARRE = 30;
let hauteurJeuActuelle;

let score = 0, vies, intervalleJeu, intervalleChute, tempsDecisecondes, intervalleTemps;
let vitesseTasse; 
let mouvementGauche = false, mouvementDroite = false;


async function afficherScores() {
    listeScoresDebut.innerHTML = "<li>Chargement...</li>";
    listeScoresFin.innerHTML = "<li>Chargement...</li>";
    try {
        const scoresRef = db.collection('scores').orderBy('score', 'desc').orderBy('temps', 'desc').limit(10);
        const snapshot = await scoresRef.get();
        listeScoresDebut.innerHTML = '';
        listeScoresFin.innerHTML = '';
        if (snapshot.empty) {
            const message = "<li>Aucun score enregistré.</li>";
            listeScoresDebut.innerHTML = message;
            listeScoresFin.innerHTML = message;
        } else {
            snapshot.forEach(doc => {
                const data = doc.data();
                const elementScore = document.createElement('li');
                const tempsJeu = data.temps || 0;
                elementScore.textContent = `${data.nom} - ${data.score} (${tempsJeu.toFixed(1)}s)`;
                listeScoresDebut.appendChild(elementScore);
                listeScoresFin.appendChild(elementScore.cloneNode(true));
            });
        }
    } catch (error) {
        console.error("Erreur de chargement des scores:", error);
        const message = "<li>Impossible de charger les scores.</li>";
        listeScoresDebut.innerHTML = message;
        listeScoresFin.innerHTML = message;
    }
}

// --- MODIFIÉ : La fonction gère maintenant les scores existants ---
async function sauvegarderScore(nom, score, tempsFinal) {
    const scoresRef = db.collection('scores');
    
    // Étape 1 : Chercher si un score existe déjà pour ce nom (sensible à la casse)
    const query = scoresRef.where('nom', '==', nom).limit(1);
    
    try {
        const snapshot = await query.get();

        if (snapshot.empty) {
            // Cas 1 : Aucun score n'existe pour ce joueur. On l'ajoute simplement.
            await scoresRef.add({
                nom: nom,
                score: score,
                temps: tempsFinal,
                date: new Date()
            });
            console.log(`Nouveau score pour ${nom} enregistré.`);
        } else {
            // Cas 2 : Un score existe déjà.
            const docExistant = snapshot.docs[0];
            const scoreExistant = docExistant.data().score;

            if (score > scoreExistant) {
                // Le nouveau score est meilleur, on met à jour le document existant.
                await scoresRef.doc(docExistant.id).update({
                    score: score,
                    temps: tempsFinal,
                    date: new Date()
                });
                console.log(`Meilleur score pour ${nom} mis à jour.`);
            } else {
                // Le score existant est meilleur ou égal, on ne fait rien.
                console.log(`Le score existant pour ${nom} est meilleur ou égal. Pas de mise à jour.`);
            }
        }
    } catch (error) {
        console.error("Erreur lors de la sauvegarde du score :", error);
    }
}


boutonStart.addEventListener('click', () => {
    ecranDebut.style.display = 'none';
    zoneJeu.style.display = 'block';
    demarrerJeu();
});

boutonRecommencer.addEventListener('click', () => {
    ecranFin.style.display = 'none';
    zoneJeu.style.display = 'block';
    formulaireScore.style.display = 'block';
    demarrerJeu();
});

function demarrerJeu() {
    ajusterAffichage(); 
    const estSurMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (estSurMobile) {
        vitesseTasse = 1; 
    } else {
        vitesseTasse = 35;
    }

    score = 0; vies = 2; tempsDecisecondes = 0;
    scoreAffiche.textContent = score;
    viesAffiche.textContent = vies;
    timerAffiche.textContent = (tempsDecisecondes / 10).toFixed(1);
    tasse.style.left = `${(zoneJeu.clientWidth / 2) - (tasse.clientWidth / 2)}px`;
    mouvementGauche = false; mouvementDroite = false;

    intervalleJeu = setInterval(boucleJeu, 20);
    intervalleChute = setInterval(genererVagueDObjets, 750); 
    
    intervalleTemps = setInterval(() => {
        tempsDecisecondes++;
        timerAffiche.textContent = (tempsDecisecondes / 10).toFixed(1);
    }, 100);
}

function finDePartie() {
    clearInterval(intervalleJeu);
    clearInterval(intervalleChute);
    clearInterval(intervalleTemps); 
    
    zoneJeu.style.display = 'none';
    ecranFin.style.display = 'block';

    scoreFinalAffiche.textContent = score;
    tempsFinalAffiche.textContent = (tempsDecisecondes / 10).toFixed(1);
    
    afficherScores();
    document.querySelectorAll('.goutte, .sucre').forEach(e => e.remove());
}

function creerUnObjet() {
    const estUnSucre = Math.random() < 0.75; 
    const objet = document.createElement('div');
    objet.className = estUnSucre ? 'sucre' : 'goutte';
    const largeurZoneChute = zoneJeu.clientWidth * 0.9;
    const decalageGauche = zoneJeu.clientWidth * 0.05;
    objet.style.left = `${Math.random() * largeurZoneChute + decalageGauche}px`;
    objet.style.top = '-50px';
    zoneJeu.appendChild(objet);
}

function genererVagueDObjets() {
    creerUnObjet();
}

function boucleJeu() {
    deplacerTasse();
    deplacerObjets();
    verifierCollisions();
}

function deplacerObjets() {
    const vitesseChute = 5 + (score * 0.5) + (tempsDecisecondes / 100);

    document.querySelectorAll('.goutte, .sucre').forEach(objet => {
        const top = parseFloat(objet.style.top);
        
        if (top > hauteurJeuActuelle) {
            objet.remove();
        } else {
            objet.style.top = `${top + vitesseChute}px`;
        }
    });
}

function deplacerTasse() {
    const positionActuelle = tasse.offsetLeft;
    const largeurZoneChute = zoneJeu.clientWidth * 0.9;
    const limiteGauche = zoneJeu.clientWidth * 0.05;
    const limiteDroite = limiteGauche + largeurZoneChute;

    if (mouvementGauche && positionActuelle > limiteGauche) {
        tasse.style.left = `${positionActuelle - vitesseTasse}px`;
    }
    if (mouvementDroite && (positionActuelle + tasse.clientWidth) < limiteDroite) {
        tasse.style.left = `${positionActuelle + vitesseTasse}px`;
    }

    if (mouvementGauche && !mouvementDroite) {
        tasse.style.transform = 'rotate(15deg)';
    } else if (mouvementDroite && !mouvementGauche) {
        tasse.style.transform = 'rotate(-15deg)';
    } else {
        tasse.style.transform = 'rotate(0deg)';
    }
}

// --- GESTION DES CONTRÔLES ---
document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') {
        mouvementGauche = true;
        e.preventDefault();
    } else if (e.key === 'ArrowRight') {
        mouvementDroite = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft') mouvementGauche = false;
    else if (e.key === 'ArrowRight') mouvementDroite = false;
});

boutonGaucheMobile.addEventListener('touchstart', e => { e.preventDefault(); mouvementGauche = true; });
boutonGaucheMobile.addEventListener('mousedown', e => { e.preventDefault(); mouvementGauche = true; });
boutonGaucheMobile.addEventListener('touchend', e => { e.preventDefault(); mouvementGauche = false; });
boutonGaucheMobile.addEventListener('mouseup', e => { e.preventDefault(); mouvementGauche = false; });
boutonGaucheMobile.addEventListener('mouseleave', e => { e.preventDefault(); mouvementGauche = false; });


boutonDroiteMobile.addEventListener('touchstart', e => { e.preventDefault(); mouvementDroite = true; });
boutonDroiteMobile.addEventListener('mousedown', e => { e.preventDefault(); mouvementDroite = true; });
boutonDroiteMobile.addEventListener('touchend', e => { e.preventDefault(); mouvementDroite = false; });
boutonDroiteMobile.addEventListener('mouseup', e => { e.preventDefault(); mouvementDroite = false; });
boutonDroiteMobile.addEventListener('mouseleave', e => { e.preventDefault(); mouvementDroite = false; });


function verifierCollisions() {
    const rectTasse = tasse.getBoundingClientRect();
    document.querySelectorAll('.goutte, .sucre').forEach(objet => {
        const rectObjet = objet.getBoundingClientRect();
        if (rectTasse.left < rectObjet.right && rectTasse.right > rectObjet.left && rectTasse.top < rectObjet.bottom && rectTasse.bottom > rectObjet.top) {
            if (objet.classList.contains('goutte')) {
                score++;
                scoreAffiche.textContent = score;
                creerAnimationScore('+1', rectTasse);
            } else {
                vies--;
                viesAffiche.textContent = vies;
                creerAnimationScore('-1', rectTasse);
            }
            objet.remove();
            if (vies <= 0) finDePartie();
        }
    });
}

function creerAnimationScore(texte, rectTasse) {
    const anim = document.createElement('div');
    anim.className = 'animation-score';
    anim.textContent = texte;

    if (texte === '+1') {
        anim.style.color = '#EB8100';
    } else {
        anim.style.color = '#D80032';
    }

    const decalageX = (Math.random() - 0.5) * 60;
    anim.style.left = `${rectTasse.left + (rectTasse.width / 2) + decalageX}px`;
    anim.style.top = `${rectTasse.top}px`;

    zoneJeu.appendChild(anim);

    setTimeout(() => {
        anim.remove();
    }, 1000);
}


formulaireScore.addEventListener('submit', async e => {
    e.preventDefault();
    const nom = document.getElementById('nom-joueur').value;
    await sauvegarderScore(nom, score, tempsDecisecondes / 10);
    await afficherScores();
    alert(`Merci ${nom}, votre score a été enregistré !`);
    formulaireScore.style.display = 'none';
});

function ajusterAffichage() {
    const hauteurFenetre = window.innerHeight;
    const espaceSupplementaire = Math.max(0, hauteurFenetre - HAUTEUR_JEU_MAX);
    const hauteurLimiteBasse = HAUTEUR_MINIMALE_BARRE + espaceSupplementaire;
    hauteurJeuActuelle = hauteurFenetre - hauteurLimiteBasse;
    limiteBasse.style.height = `${hauteurLimiteBasse}px`;
    tasse.style.bottom = `${hauteurLimiteBasse}px`;
}


// --- INITIALISATION ---
window.addEventListener('resize', ajusterAffichage); 
ajusterAffichage(); 
afficherScores();