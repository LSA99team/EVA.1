// Globale Variablen
let haltestellenMap = {}; // Mapping von Nummer zu Name
let alleFahrplaene = [];
let useSimulated = false;

// DOM Elemente
const startStationInput = document.getElementById('startStation');
const endStationInput = document.getElementById('endStation');
const searchDateInput = document.getElementById('searchDate');
const searchTimeInput = document.getElementById('searchTime');
const simulatedTimeInput = document.getElementById('simulatedTime');
const searchButton = document.getElementById('searchButton');
const swapButton = document.getElementById('swapButton');
const resetButton = document.getElementById('resetButton');
const useSimulatedButton = document.getElementById('useSimulatedButton');
const resultsPanel = document.getElementById('resultsPanel');
const noResults = document.getElementById('noResults');
const resultsContainer = document.getElementById('resultsContainer');
const resultInfo = document.getElementById('resultInfo');
const loadingSpinner = document.getElementById('loadingSpinner');

// Initialisierung beim Laden
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        // Lade die Stationen
        await loadStations();
        
        // Lade die Fahrpläne
        await loadFahrplaene();
        
        // Setze heute als Standard Datum
        const today = new Date().toISOString().split('T')[0];
        searchDateInput.value = today;
        
        // Event Listener
        searchButton.addEventListener('click', performSearch);
        swapButton.addEventListener('click', swapStations);
        resetButton.addEventListener('click', resetForm);
        useSimulatedButton.addEventListener('click', toggleSimulated);
        
        // Enter-Taste zum Suchen
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
        
        console.log('App erfolgreich initialisiert');
    } catch (error) {
        console.error('Fehler bei der Initialisierung:', error);
    }
}

// Laden der Haltestellen aus der Datei
async function loadStations() {
    try {
        const response = await fetch('data/haltestellen.json');
        const data = await response.json();
        
        // Erstelle ein Mapping von Nummer zu Name
        data.haltestellen.forEach(halt => {
            haltestellenMap[halt.nummer] = halt.name;
        });
        
        console.log(`${data.haltestellen.length} Haltestellen geladen`);
    } catch (error) {
        console.error('Fehler beim Laden der Haltestellen:', error);
    }
}

// Laden der Fahrpläne aus allen Ordnern
async function loadFahrplaene() {
    try {
        alleFahrplaene = [];
        
        // Lade Fahrpläne aus allen Zugtyp-Ordnern
        const fahrplanDateien = [
            'data/fahrplan/RB/RB101.json',
            'data/fahrplan/RB/RB201.json',
            'data/fahrplan/RE/RE103.json',
            'data/fahrplan/SSMB/SSMB501.json',
            'data/fahrplan/NSMB/NSMB601.json',
            'data/fahrplan/S-bahn/SMSB/SMSB701.json'
        ];
        
        for (const datei of fahrplanDateien) {
            try {
                const response = await fetch(datei);
                if (response.ok) {
                    const fahrplan = await response.json();
                    alleFahrplaene.push(fahrplan);
                }
            } catch (error) {
                console.warn(`Fehler beim Laden von ${datei}:`, error);
            }
        }
        
        console.log(`${alleFahrplaene.length} Fahrplan-Dateien geladen`);
    } catch (error) {
        console.error('Fehler beim Laden der Fahrpläne:', error);
    }
}

// Tauscht Von und Bis
function swapStations() {
    const temp = startStationInput.value;
    startStationInput.value = endStationInput.value;
    endStationInput.value = temp;
}

// Setzt das Formular zurück
function resetForm() {
    startStationInput.value = '';
    endStationInput.value = '';
    const today = new Date().toISOString().split('T')[0];
    searchDateInput.value = today;
    searchTimeInput.value = '14:00';
    simulatedTimeInput.value = '14:00';
    useSimulated = false;
    updateSimulatedButtonState();
    resultsPanel.style.display = 'none';
    noResults.style.display = 'none';
}

// Toggled die simulierte Zeit
function toggleSimulated() {
    useSimulated = !useSimulated;
    updateSimulatedButtonState();
}

// Aktualisiert den Zustand des Simulated-Buttons
function updateSimulatedButtonState() {
    if (useSimulated) {
        useSimulatedButton.style.backgroundColor = '#FF6B6B';
        useSimulatedButton.style.color = 'white';
        useSimulatedButton.textContent = '⏱ Simulierte Zeit AKTIV';
    } else {
        useSimulatedButton.style.backgroundColor = '';
        useSimulatedButton.style.color = '';
        useSimulatedButton.textContent = 'Simulierte Zeit verwenden';
    }
}

// Führt die Suche durch
async function performSearch() {
    const startStationNum = startStationInput.value;
    const endStationNum = endStationInput.value;
    const searchDate = searchDateInput.value;
    const currentTime = useSimulated ? simulatedTimeInput.value : searchTimeInput.value;
    
    // Validierung
    if (!startStationNum || !endStationNum) {
        alert('Bitte gebe Start- und Zielstation-Nummern ein.');
        return;
    }
    
    if (startStationNum === endStationNum) {
        alert('Start- und Zielstation können nicht gleich sein.');
        return;
    }
    
    // Validiere Nummern (1-30)
    const start = parseInt(startStationNum);
    const end = parseInt(endStationNum);
    if (isNaN(start) || isNaN(end) || start < 1 || start > 30 || end < 1 || end > 999) {
        alert('Gebe Nummern zwischen 1 und 999 ein.');
        return;
    }
    
    // Loading Spinner anzeigen
    loadingSpinner.style.display = 'flex';
    resultsPanel.style.display = 'none';
    noResults.style.display = 'none';
    
    // Simuliere eine Netzwerkverzögerung
    await new Promise(resolve => setTimeout(resolve, 800));
    
    try {
        // Suche Verbindungen (über mehrere Tage wenn nötig)
        const connections = searchConnections(startStationNum, endStationNum, searchDate, currentTime);
        
        // Anzeigen der Ergebnisse
        displayResults(connections, startStationNum, endStationNum, searchDate, currentTime);
        
    } catch (error) {
        console.error('Fehler bei der Suche:', error);
        noResults.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Sucht Verbindungen mit neuer Struktur (nächste 3 + Umstiege bis max 3x)
// Sucht über mehrere Tage, bis 3 Verbindungen gefunden oder Limit erreicht
function searchConnections(startStationNum, endStationNum, startDate, currentTime) {
    const foundConnections = [];
    const maxDays = 7; // Suche max 7 Tage voraus
    let searchDate = new Date(startDate);
    let daysSearched = 0;
    let searchTime = currentTime;
    
    while (foundConnections.length < 3 && daysSearched < maxDays) {
        const dateString = searchDate.toISOString().split('T')[0];
        
        // 1. Suche direkte Verbindungen für diesen Tag
        const directConnections = findDirectConnections(startStationNum, endStationNum, dateString, searchTime);
        foundConnections.push(...directConnections);
        
        // 2. Suche Umsteigeverbindungen (max 3 Umstiege = 4 Züge)
        if (foundConnections.length < 3) {
            const transferConnections = findTransferConnections(startStationNum, endStationNum, dateString, searchTime, 3);
            foundConnections.push(...transferConnections);
        }
        
        // Wenn wir 3 oder mehr haben, breche ab
        if (foundConnections.length >= 3) {
            break;
        }
        
        // Gehe zum nächsten Tag über, nutze Mitternacht als Zeit
        searchDate.setDate(searchDate.getDate() + 1);
        searchTime = '00:00';
        daysSearched++;
    }
    
    // Sortiere nach Abfahrtszeit
    foundConnections.sort((a, b) => {
        const timeA = timeToMinutes(a.abfahrtszeit);
        const timeB = timeToMinutes(b.abfahrtszeit);
        return timeA - timeB;
    });
    
    // Gib die nächsten 3 Verbindungen zurück
    return foundConnections.slice(0, 3);
}

// Findet direkte Verbindungen für ein bestimmtes Datum
function findDirectConnections(startStationNum, endStationNum, searchDate, currentTime) {
    const directConnections = [];
    
    alleFahrplaene.forEach(fahrplan => {
        fahrplan.fahrten.forEach(fahrt => {
            const startIndex = fahrt.halte.findIndex(h => h.station_nr === parseInt(startStationNum));
            const endIndex = fahrt.halte.findIndex(h => h.station_nr === parseInt(endStationNum));
            
            if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
                return;
            }
            
            const connection = createConnectionInstance(
                fahrplan,
                fahrt,
                startIndex,
                endIndex,
                searchDate,
                currentTime
            );
            
            if (connection) {
                directConnections.push(connection);
            }
        });
    });
    
    return directConnections;
}

// Findet Umsteigeverbindungen
function findTransferConnections(startStationNum, endStationNum, searchDate, currentTime, maxTransfers) {
    const transferConnections = [];
    
    // Finde alle Züge, die von der Startstation abfahren
    const firstLegs = [];
    alleFahrplaene.forEach(fahrplan => {
        fahrplan.fahrten.forEach(fahrt => {
            const startIndex = fahrt.halte.findIndex(h => h.station_nr === parseInt(startStationNum));
            if (startIndex === -1) return;
            
            const connection = createConnectionInstance(
                fahrplan,
                fahrt,
                startIndex,
                fahrt.halte.length - 1,
                searchDate,
                currentTime
            );
            
            if (connection) {
                firstLegs.push({
                    connection: connection,
                    fahrplan: fahrplan,
                    fahrt: fahrt,
                    startIndex: startIndex,
                    endIndex: fahrt.halte.length - 1,
                    stops: fahrt.halte
                });
            }
        });
    });
    
    // Für jeden ersten Zug suche Anschlüsse
    firstLegs.forEach(firstLeg => {
        const arrivalStation = firstLeg.stops[firstLeg.endIndex].station_nr;
        const arrivalTime = firstLeg.stops[firstLeg.endIndex].ankunft;
        
        // Überspringe wenn keine Ankunftszeit vorhanden
        if (!arrivalTime) return;
        
        const arrivalMinutes = timeToMinutes(arrivalTime);
        
        // Suche Züge, die von dieser Station 10+ Minuten später abfahren
        alleFahrplaene.forEach(fahrplan => {
            fahrplan.fahrten.forEach(fahrt => {
                const transferStartIndex = fahrt.halte.findIndex(h => h.station_nr === arrivalStation);
                if (transferStartIndex === -1) return;
                
                const departureTime = fahrt.halte[transferStartIndex].abfahrt;
                
                // Überspringe wenn keine Abfahrtszeit vorhanden
                if (!departureTime) return;
                
                const departureMinutes = timeToMinutes(departureTime);
                
                // Mindestens 10 Minuten Umsteigezeit
                if (departureMinutes < arrivalMinutes + 10) {
                    return;
                }
                
                const transferEndIndex = fahrt.halte.findIndex(h => h.station_nr === parseInt(endStationNum));
                if (transferEndIndex === -1 || transferEndIndex <= transferStartIndex) {
                    return;
                }
                
                const transferConnection = createConnectionInstance(
                    fahrplan,
                    fahrt,
                    transferStartIndex,
                    transferEndIndex,
                    searchDate,
                    departureTime
                );
                
                if (transferConnection) {
                    transferConnections.push({
                        type: 'transfer',
                        legs: [firstLeg.connection, transferConnection],
                        abfahrtszeit: firstLeg.connection.abfahrtszeit,
                        ankunftszeit: transferConnection.ankunftszeit,
                        umsteige: 1
                    });
                }
            });
        });
    });
    
    return transferConnections;
}

// Erstellt eine Instanz einer Verbindung für einen bestimmten Tag
function createConnectionInstance(fahrplan, fahrt, startIndex, endIndex, searchDate, currentTime) {
    // Prüfe ob die Fahrt am gesuchten Datum gültig ist
    if (!isFahrtGueltig(fahrt, searchDate)) {
        return null;
    }
    
    // Prüfe ob die ganze Fahrt am gesuchten Datum ausfällt
    const ganzAusfall = fahrt.ausfaelle.some(a => a.datum === searchDate && a.typ === 'ganz');
    if (ganzAusfall) {
        return null;
    }
    
    // Berechne die aktuellen Zeiten für diese Fahrt
    const halteAktuell = calculateActualStops(fahrt, startIndex, endIndex, searchDate);
    
    // Prüfe ob die Abfahrt noch in der Zukunft liegt
    const abfahrtMinuten = timeToMinutes(halteAktuell[0].abfahrt);
    if (abfahrtMinuten < timeToMinutes(currentTime)) {
        return null;
    }
    
    return {
        zugtyp: fahrplan.zugtyp,
        liniennummer: fahrplan.liniennummer,
        variant: fahrt.variant,
        startstation_nr: fahrplan.startstation_nr,
        startstation_name: fahrplan.startstation_name,
        zielstation_nr: fahrplan.zielstation_nr,
        zielstation_name: fahrplan.zielstation_name,
        abfahrtszeit: halteAktuell[0].abfahrt,
        ankunftszeit: halteAktuell[halteAktuell.length - 1].ankunft,
        halte: halteAktuell,
        allHalte: fahrt.halte,
        originalFahrt: fahrt
    };
}

// Prüft ob eine Fahrt an einem bestimmten Datum gültig ist
function isFahrtGueltig(fahrt, datum) {
    const checkDate = new Date(datum);
    const gueltigVon = new Date(fahrt.gueltig_von);
    const gueltigBis = new Date(fahrt.gueltig_bis);
    
    // Prüfe Datumsbereich
    if (checkDate < gueltigVon || checkDate > gueltigBis) {
        return false;
    }
    
    // Prüfe Wochentag
    const dayOfWeek = checkDate.getDay();
    const wochentage = {
        'So': 0,
        'Mo': 1,
        'Di': 2,
        'Mi': 3,
        'Do': 4,
        'Fr': 5,
        'Sa': 6
    };
    
    for (const [tag, num] of Object.entries(wochentage)) {
        if (fahrt.wochentage.includes(tag) && num === dayOfWeek) {
            return true;
        }
    }
    
    return false;
}

// Berechnet die aktuellen Zeiten unter Berücksichtigung von Ausfällen und Zusatzhaltestellen
function calculateActualStops(fahrt, startIndex, endIndex, datum) {
    let halte = [...fahrt.halte];
    
    // Speichere die Start- und End-Haltnummern, bevor wir Änderungen machen
    const startHaltNummer = halte[startIndex].halt_nummer;
    const endHaltNummer = halte[endIndex].halt_nummer;
    
    // Finde Ausfallhaltestellen für diesen Tag
    const haltAusfaelleFuerTag = fahrt.ausfaelle.filter(a => a.datum === datum && a.typ === 'halt');
    
    // Entferne Ausfallhaltestellen und berechne Zeit-Verschiebungen
    haltAusfaelleFuerTag.forEach(ausfall => {
        const haltIndex = halte.findIndex(h => h.halt_nummer === ausfall.halt_nummer);
        if (haltIndex !== -1) {
            const entferterHalt = halte[haltIndex];
            
            // Berechne die eingesparte Zeit
            let zeitErsparnis = 0;
            if (entferterHalt.abfahrt && haltIndex > 0) {
                const vorherAbfahrt = halte[haltIndex - 1].abfahrt;
                zeitErsparnis = timeToMinutes(entferterHalt.abfahrt) - timeToMinutes(vorherAbfahrt);
            }
            
            // Entferne den Halt
            halte.splice(haltIndex, 1);
            
            // Verschiebe alle nachfolgenden Zeiten
            for (let i = haltIndex; i < halte.length; i++) {
                if (halte[i].ankunft) {
                    halte[i].ankunft = minutesToTime(timeToMinutes(halte[i].ankunft) - zeitErsparnis);
                }
                if (halte[i].abfahrt) {
                    halte[i].abfahrt = minutesToTime(timeToMinutes(halte[i].abfahrt) - zeitErsparnis);
                }
            }
        }
    });
    
    // Füge Zusatzhaltestellen für diesen Tag hinzu
    const zusatzFuerTag = fahrt.zusatzhalt.filter(z => z.datum === datum);
    zusatzFuerTag.forEach(zusatz => {
        const neuerHalt = {
            halt_nummer: zusatz.halt_nummer,
            station_nr: zusatz.station_nr,
            station_name: zusatz.station_name,
            ankunft: zusatz.zeit,
            abfahrt: zusatz.abfahrt || zusatz.zeit,
            versp_standard: 0
        };
        
        // Berechne Zeitzusatz für nachfolgende Haltestellen
        let zeitZusatz = 2; // Standardmäßig 2 Minuten für Zusatzhalt
        
        // Füge den Halt an der richtigen Position ein
        const insertIndex = halte.findIndex(h => h.halt_nummer > zusatz.halt_nummer);
        if (insertIndex !== -1) {
            halte.splice(insertIndex, 0, neuerHalt);
            
            // Verschiebe nachfolgende Zeiten
            for (let i = insertIndex + 1; i < halte.length; i++) {
                if (halte[i].ankunft) {
                    halte[i].ankunft = minutesToTime(timeToMinutes(halte[i].ankunft) + zeitZusatz);
                }
                if (halte[i].abfahrt) {
                    halte[i].abfahrt = minutesToTime(timeToMinutes(halte[i].abfahrt) + zeitZusatz);
                }
            }
        }
    });
    
    // Gib nur die Halte zwischen Start und End zurück (nutze halt_nummer, nicht Index!)
    return halte.filter(h => h.halt_nummer >= startHaltNummer && h.halt_nummer <= endHaltNummer);
}

// Konvertiert Zeit zu Minuten
function timeToMinutes(timeString) {
    if (!timeString) return 0; // Fallback für null/undefined
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    const [hours, minutes] = parts.map(Number);
    return isNaN(hours) || isNaN(minutes) ? 0 : hours * 60 + minutes;
}

// Konvertiert Minuten zu Zeit-String
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Zeigt die Ergebnisse an
function displayResults(connections, startStationNum, endStationNum, searchDate, currentTime) {
    if (connections.length === 0) {
        noResults.style.display = 'block';
        resultsPanel.style.display = 'none';
        return;
    }
    
    resultsPanel.style.display = 'block';
    noResults.style.display = 'none';
    
    // Aktualisiere die Info
    const dateDisplay = formatDate(searchDate);
    const timeStatus = useSimulated ? `Simulierte Zeit: ${currentTime}` : `Normale Zeit: ${currentTime}`;
    const startName = haltestellenMap[startStationNum] || `Station ${startStationNum}`;
    const endName = haltestellenMap[endStationNum] || `Station ${endStationNum}`;
    resultInfo.textContent = `${connections.length} Verbindung${connections.length !== 1 ? 'en' : ''} gefunden von ${startName} bis ${endName} | ${dateDisplay} | ${timeStatus}`;
    
    // Leere alte Ergebnisse
    resultsContainer.innerHTML = '';
    
    // Erstelle Karten für jede Verbindung
    connections.forEach((connection) => {
        const card = createConnectionCard(connection);
        resultsContainer.appendChild(card);
    });
}

// Erstellt eine Verbindungskarte mit neuer Struktur
function createConnectionCard(connection) {
    // Handhabe Umsteigeverbindungen
    if (connection.type === 'transfer') {
        return createTransferCard(connection);
    }
    
    // Normale direkte Verbindung
    const startStop = connection.halte[0];
    const endStop = connection.halte[connection.halte.length - 1];
    
    // Berechne die Fahrtdauer
    const durationMinutes = timeToMinutes(endStop.ankunft) - timeToMinutes(startStop.abfahrt);
    const durationHours = Math.floor(durationMinutes / 60);
    const durationMins = durationMinutes % 60;
    const durationText = `${durationHours}:${String(durationMins).padStart(2, '0')} Std.`;
    
    // Berechne maximale Verspätung auf der Route
    let maxDelay = 0;
    connection.halte.forEach(halt => {
        if (halt.versp_standard) {
            maxDelay = Math.max(maxDelay, halt.versp_standard);
        }
    });
    
    // Erstelle die Karte
    const card = document.createElement('div');
    card.className = 'connection-card';
    
    // Status Badge
    let delayStatus = 'on-time';
    let delayText = 'Pünktlich';
    if (maxDelay > 0) {
        delayStatus = 'delayed';
        delayText = `+${maxDelay} Min.`;
    } else if (maxDelay < 0) {
        delayStatus = 'early';
        delayText = `${maxDelay} Min.`;
    }
    
    card.innerHTML = `
        <div class="connection-header">
            <div class="connection-time">
                <span class="departure-time">${startStop.abfahrt}</span>
                <span class="arrival-time">${endStop.ankunft}</span>
                <span class="connection-duration">${durationText}</span>
            </div>
            <div class="train-info">
                <span class="train-type">${connection.zugtyp}</span>
                <div class="train-details">
                    <div class="train-number">Linie: ${connection.liniennummer}</div>
                    <div class="train-id">Zug: ${connection.variant}</div>
                </div>
            </div>
            <div class="delay-status ${delayStatus}">${delayText}</div>
        </div>
        <div class="stops-list">
            ${createStopsHtmlNew(connection.halte)}
        </div>
    `;
    
    // Toggle für die Haltestellen-Liste
    card.addEventListener('click', (e) => {
        if (e.target.closest('.stops-list')) return;
        card.classList.toggle('expanded');
    });
    
    return card;
}

// Erstellt eine Karte für Umsteigeverbindungen
function createTransferCard(connection) {
    const firstLeg = connection.legs[0];
    const secondLeg = connection.legs[1];
    
    const startStop = firstLeg.halte[0];
    const transferStop = firstLeg.halte[firstLeg.halte.length - 1];
    const endStop = secondLeg.halte[secondLeg.halte.length - 1];
    
    // Berechne die Gesamtfahrtdauer
    const totalMinutes = timeToMinutes(endStop.ankunft) - timeToMinutes(startStop.abfahrt);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;
    const durationText = `${totalHours}:${String(totalMins).padStart(2, '0')} Std.`;
    
    // Berechne Umsteigezeit
    const transferMinutes = timeToMinutes(secondLeg.halte[0].abfahrt) - timeToMinutes(transferStop.ankunft);
    
    const card = document.createElement('div');
    card.className = 'connection-card transfer-card';
    
    card.innerHTML = `
        <div class="connection-header">
            <div class="connection-time">
                <span class="departure-time">${startStop.abfahrt}</span>
                <span class="arrival-time">${endStop.ankunft}</span>
                <span class="connection-duration">${durationText}</span>
            </div>
            <div class="train-info">
                <span class="transfer-badge">🔄 ${connection.umsteige} Umstieg</span>
            </div>
        </div>
        <div class="transfer-details">
            <div class="leg">
                <strong>${firstLeg.zugtyp} ${firstLeg.liniennummer}</strong> ab ${startStop.abfahrt}
                <div class="transfer-station">→ ${haltestellenMap[transferStop.station_nr] || transferStop.station_name}</div>
                <small>Ankunft: ${transferStop.ankunft} (Umsteigezeit: ${transferMinutes} Min.)</small>
            </div>
            <div class="leg">
                <strong>${secondLeg.zugtyp} ${secondLeg.liniennummer}</strong> ab ${secondLeg.halte[0].abfahrt}
                <div class="transfer-station">→ ${haltestellenMap[endStop.station_nr] || endStop.station_name}</div>
                <small>Ankunft: ${endStop.ankunft}</small>
            </div>
        </div>
        <div class="stops-list">
            ${createStopsHtmlNew(firstLeg.halte)}
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
            ${createStopsHtmlNew(secondLeg.halte)}
        </div>
    `;
    
    // Toggle für Details
    card.addEventListener('click', (e) => {
        if (e.target.closest('.stops-list')) return;
        card.classList.toggle('expanded');
    });
    
    return card;
}

// Erstellt das HTML für die Haltestellen mit neuer Struktur
function createStopsHtmlNew(halte) {
    let html = '';
    
    halte.forEach((halt) => {
        let delayClass = '';
        let delayHtml = '';
        if (halt.versp_standard > 0) {
            delayClass = 'delayed';
            delayHtml = `<div class="stop-delay ${delayClass}">+${halt.versp_standard} Min.</div>`;
        } else if (halt.versp_standard < 0) {
            delayClass = 'early';
            delayHtml = `<div class="stop-delay ${delayClass}">${halt.versp_standard} Min.</div>`;
        }
        
        const departureTime = halt.abfahrt ? `Abf: ${halt.abfahrt}` : '';
        const arrivalTime = halt.ankunft ? `Ank: ${halt.ankunft}` : '';
        const timesDisplay = [arrivalTime, departureTime].filter(t => t).join(' | ');
        
        // Nutze station_name falls vorhanden, sonst station_nr
        const stationName = halt.station_name || haltestellenMap[halt.station_nr] || `Station ${halt.station_nr}`;
        
        html += `
            <div class="stop-item">
                <div class="stop-number">${halt.halt_nummer}</div>
                <div class="stop-details">
                    <div class="stop-station">${stationName}</div>
                    <div class="stop-times">${timesDisplay}</div>
                </div>
                ${delayHtml}
            </div>
        `;
    });
    
    return html;
}

// Formatiert das Datum
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('de-DE', options);
}
