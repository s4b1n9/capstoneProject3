// Import der benötigten Module
import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

// Initialisierung der Express-App und Festlegung des Ports
const app = express();
const port = 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));
// Setzen des View-Engines und Verwendung von Middleware
app.set('view engine','ejs');
app.use(express.static(__dirname+"/public"));
// Definiere einen MIME-Typ-Override für JavaScript-Dateien
express.static.mime.define({ 'application/javascript': ['js'] });

app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride('_method'));

// Globale Variablen zur Verwaltung der Beiträge und der Beitrags-ID
let beitraege = [];
let beitragIdCounter = 1; // Start der Beitrags-ID bei 1

// Funktion zum Laden der Beiträge aus der JSON-Datei beim Start der Anwendung
function ladeBeitrag(req, res, next) {
    try {
        const data = fs.readFileSync('./data/posts.json');
        beitraege = JSON.parse(data);
        console.log('Beiträge erfolgreich geladen.');
        if (beitraege.length > 0) {
            beitragIdCounter = Math.max(...beitraege.map(beitrag => beitrag.id)) + 1;
        } else {
            beitragIdCounter = 1; // Wenn keine Beiträge vorhanden sind, beginne mit ID 1
        }
        next();
    } catch (err) {
        console.error('Fehler beim Laden der Beiträge:', err);
        res.status(500).send('Interner Serverfehler');
    }
}

// Funktion zum Hinzufügen eines neuen Beitrags
function beitrag(req, res, next) {
    if (!req.body || !req.body.titel || !req.body.autor || !req.body.inhalt) {
        console.error('Fehler: Ungültige Anfrage oder fehlende Daten.');
        return res.status(400).send('Fehler: Ungültige Anfrage oder fehlende Daten.');
    }
    const titel = req.body.titel;
    const autor = req.body.autor;
    const inhalt = req.body.inhalt;
    const datum = new Date();

    const beitrag = {
        id: beitragIdCounter,
        titel: titel,
        autor: autor,
        inhalt: inhalt,
        datum: datum,
    };

    // Beitrag zum Array hinzufügen
    beitraege.unshift(beitrag); // Neueste Beiträge zuerst hinzufügen

    // JSON-Datei aktualisieren
    updateJSONFile();
    beitragIdCounter++;
    res.redirect('/');
}

// Funktion zum Aktualisieren der JSON-Datei
function updateJSONFile() {
    fs.writeFile('./data/posts.json', JSON.stringify(beitraege, null, 2), (err) => {
        if (err) {
            console.error('Fehler beim Speichern der Datei:', err);
            return;
        }
        console.log('JSON-Datei erfolgreich aktualisiert.');
    });
}

// Funktion zum Abrufen eines Beitrags entsprechend seiner ID
function getBeitragByID(beitragId) {
    const beitrag = beitraege.find(beitrag => beitrag.id === parseInt(beitragId));
    return beitrag;
}

// Startseite
app.get('/', (req, res) => {
    // Beiträge aus der JSON-Datei lesen
    ladeBeitrag(req, res, () => {
        // Rendern der Startseite und Übergabe der Beitragsdaten
        res.render('index', { beitraege: beitraege });
    });
});

// Erstellen eines Beitrags
app.post('/beitrag', (req, res) => {
    beitrag(req, res);
});

// Rendern Beitragsformular
app.get('/edit/:beitragId', (req, res) => {
    const beitragId = req.params.beitragId;
    const beitrag = getBeitragByID(beitragId);
    if (beitrag){
        res.render('edit', { beitragId: beitragId, beitrag: beitrag });
    }else{
        res.status(404).send('Beitrag nicht gefunden');
    }
    
});

// Bearbeiten eines Beitrags
app.post('/edit/:beitragId', (req, res) => {
    const beitragId = req.params.beitragId;
    const aktualisiert = req.body.aktualisiert;

    // Suche den Index des zu bearbeitenden Beitrags
    const index = beitraege.findIndex(beitrag => beitrag.id === parseInt(beitragId));

    // Überprüfe, ob der Beitrag gefunden wurde
    if (index !== -1) {
        // Aktualisiere den Inhalt des Beitrags
        beitraege[index].inhalt = aktualisiert;

        // Aktualisiere die JSON-Datei mit den neuen Beitragsdaten
        updateJSONFile();

        // Umleitung zur Hauptseite nach dem Aktualisieren
        res.redirect('/');
    } else {
        // Beitrag nicht gefunden, sende Fehlermeldung
        res.status(404).send('Beitrag nicht gefunden');
    }
});

// Löschen eines Beitrags
app.delete('/delete/:beitragId', (req, res) => {
    const beitragId = req.params.beitragId;
    const index = beitraege.findIndex(beitrag => beitrag.id === parseInt(beitragId));

    if (index !== -1) {
        // Lösche den Beitrag aus dem Array
        beitraege.splice(index, 1);
        // JSON-Datei aktualisieren
        updateJSONFile();
    }

    // Umleitung zur Hauptseite nach dem Löschen
    res.redirect('/');
});

//Server prüfen
app.listen(port, () => {
    console.log(`Server läuft auf ${port}`);
});
