# Zwei

Una PWA in italiano per organizzare due anni in Germania: agenda, conteggio ore, inventario e foto di frigo e spesa.

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
- Inventario con quantità, posizione, ricerca e scadenze.
- Foto di frigo e spesa scattate direttamente dal telefono.
- Tema chiaro/scuro, uso offline e layout responsive.

Al primo avvio sono presenti pochi dati di esempio, tutti modificabili o eliminabili.
