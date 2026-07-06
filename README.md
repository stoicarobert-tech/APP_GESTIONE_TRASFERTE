# FOCUS

Una PWA in italiano per organizzare ogni trasferta: agenda, conteggio ore, profili locali, inventario e foto di frigo e spesa.

**App online:** https://stoicarobert-tech.github.io/FOCUS/

## Avvio sul computer

Fai doppio clic su `avvia-app.bat`, oppure apri PowerShell in questa cartella ed esegui:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Poi visita `http://127.0.0.1:4173`.

## Installazione sul telefono

Per installarla sul telefono deve essere pubblicata su un indirizzo HTTPS. La cartella può essere caricata così com'è su GitHub Pages, Netlify o Vercel, senza compilazione.

- Android / Chrome: apri il sito e scegli **Installa app**.
- iPhone / Safari: **Condividi → Aggiungi alla schermata Home**.

I dati sono salvati localmente sul dispositivo. Le attività e l'inventario usano l'archiviazione del browser; le foto sono compresse e salvate in IndexedDB. Il comando **Esporta i tuoi dati** crea un backup JSON completo.

## Funzioni

- Agenda giornaliera con categorie Lavoro, Palestra, Gaming e Altro.
- Totali automatici per settimana, mese o intero periodo.
- Obiettivo settimanale modificabile.
- Trasferta con destinazione, bandiera, date e countdown automatico.
- Inventario con quantità, posizione, ricerca e scadenze.
- Foto di frigo e spesa scattate direttamente dal telefono.
- Tema chiaro/scuro, uso offline e layout responsive.
- Profili locali con username e dati separati, persistenti sul dispositivo.
- Importazione del backup del profilo principale ed eliminazione sicura dei profili.

Al primo avvio sono presenti pochi dati di esempio, tutti modificabili o eliminabili.
