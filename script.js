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

const db = firebase.firestore();

let score = 0, vies, vitesseChute, intervalleJeu, intervalleChute, tempsDecisecondes, intervalleTemps;
let vitesseTasse = 35; 
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

async function sauvegarderScore(nom, score, tempsFinal) {
    try {
        await db.collection('scores').add({
            nom: nom,
            score: score,
            temps: tempsFinal,
            date: new Date()
        });
    } catch (error) {
        console.error("Erreur d'enregistrement du score:", error);
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
    score = 0; vies = 2; vitesseChute = 5; tempsDecisecondes = 0;
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

    if (mouvementGauche && !mouvementDroite) {
        tasse.style.transform = 'rotate(15deg)';
    } else if (mouvementDroite && !mouvementGauche) {
        tasse.style.transform = 'rotate(-15deg)';
    } else {
        tasse.style.transform = 'rotate(0deg)';
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
                vitesseChute += 1.5; 
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
    await sauvegarderScore(nom, score, tempsDecisecondes / 10);
    await afficherScores();
    alert(`Merci ${nom}, votre score a été enregistré !`);
    formulaireScore.style.display = 'none';
});

// --- INITIALISATION ---
afficherScores();