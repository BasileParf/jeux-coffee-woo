// --- ÉLÉMENTS DU DOM ET VARIABLES DU JEU ---
const ecranDebut = document.getElementById('ecran-debut');
const ecranFin = document.getElementById('ecran-fin');
const zoneJeu = document.getElementById('zone-jeu');
const tasse = document.getElementById('tasse');
const scoreAffiche = document.getElementById('score');
const viesAffiche = document.getElementById('vies');
const scoreFinalAffiche = document.getElementById('score-final');
const boutonStart = document.getElementById('bouton-start');
const boutonRecommencer = document.getElementById('bouton-recommencer');
const formulaireScore = document.getElementById('formulaire-score');
const listeScoresDebut = document.getElementById('liste-scores-debut');
const listeScoresFin = document.getElementById('liste-scores-fin');

// On accède à Firebase, qui est initialisé dans l'HTML
const db = firebase.firestore();

let score = 0, vies, vitesseChute, intervalleJeu, intervalleChute;
let vitesseTasse = 20; 
let mouvementGauche = false, mouvementDroite = false;

// --- GESTION DU TABLEAU DES SCORES (AVEC FIREBASE) ---
async function afficherScores() {
    listeScoresDebut.innerHTML = "<li>Chargement...</li>";
    listeScoresFin.innerHTML = "<li>Chargement...</li>";
    try {
        const scoresRef = db.collection('scores').orderBy('score', 'desc').limit(10);
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
                elementScore.textContent = `${data.nom} - ${data.score}`;
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

async function sauvegarderScore(nom, score) {
    try {
        await db.collection('scores').add({
            nom: nom,
            score: score,
            date: new Date()
        });
    } catch (error) {
        console.error("Erreur d'enregistrement du score:", error);
    }
}

// --- LOGIQUE PRINCIPALE DU JEU ---
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
    score = 0; vies = 2; vitesseChute = 5; 
    scoreAffiche.textContent = score;
    viesAffiche.textContent = vies;
    tasse.style.left = `${(zoneJeu.clientWidth / 2) - (tasse.clientWidth / 2)}px`;
    mouvementGauche = false; mouvementDroite = false;
    intervalleJeu = setInterval(boucleJeu, 20);
    intervalleChute = setInterval(genererVagueDObjets, 600); 
}

function finDePartie() {
    clearInterval(intervalleJeu);
    clearInterval(intervalleChute);
    zoneJeu.style.display = 'none';
    ecranFin.style.display = 'block';
    scoreFinalAffiche.textContent = score;
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
    if (Math.random() < 0.25) {
        creerUnObjet(); 
    }
}

function boucleJeu() {
    deplacerTasse();
    deplacerObjets();
    verifierCollisions();
}

function deplacerObjets() {
    document.querySelectorAll('.goutte, .sucre').forEach(objet => {
        const top = parseFloat(objet.style.top);
        if (top > zoneJeu.clientHeight) objet.remove();
        else objet.style.top = `${top + vitesseChute}px`;
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
}

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') mouvementGauche = true;
    else if (e.key === 'ArrowRight') mouvementDroite = true;
});

document.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft') mouvementGauche = false;
    else if (e.key === 'ArrowRight') mouvementDroite = false;
});

function verifierCollisions() {
    const rectTasse = tasse.getBoundingClientRect();
    document.querySelectorAll('.goutte, .sucre').forEach(objet => {
        const rectObjet = objet.getBoundingClientRect();
        if (rectTasse.left < rectObjet.right && rectTasse.right > rectObjet.left && rectTasse.top < rectObjet.bottom && rectTasse.bottom > rectObjet.top) {
            if (objet.classList.contains('goutte')) {
                score++;
                scoreAffiche.textContent = score;
                // MODIFICATION : La vitesse augmente maintenant deux fois plus vite !
                vitesseChute += 0.3; 
            } else {
                vies--;
                viesAffiche.textContent = vies;
            }
            objet.remove();
            if (vies <= 0) finDePartie();
        }
    });
}

formulaireScore.addEventListener('submit', async e => {
    e.preventDefault();
    const nom = document.getElementById('nom-joueur').value;
    await sauvegarderScore(nom, score);
    await afficherScores();
    alert(`Merci ${nom}, votre score a été enregistré !`);
    formulaireScore.style.display = 'none';
});

// --- INITIALISATION ---
afficherScores();