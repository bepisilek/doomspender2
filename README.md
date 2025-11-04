# Munkaóra PWA

## Helyi futtatás
- Töltsd le vagy klónozd a projektet.
- Nyisd meg a `index.html` fájlt egy Chromium, Firefox vagy Safari böngészőben.

## Telepítés GitHub Pages-re
1. Hozz létre egy új publikus GitHub repót, és töltsd fel a fájlokat.
2. A repo beállításainál kapcsold be a GitHub Pages-t a `main` ághoz (root mappa).
3. Várd meg a publikálást, majd a kapott URL-en elérhető lesz az app.

## PWA tesztelése
- **Chrome/Edge (asztali):** Nyisd meg az oldalt, majd a DevTools → Application → Manifest fülön ellenőrizd az ikonokat, és használd az "Install" opciót.
- **iOS Safari:** Megnyitás után oszd meg az oldalt, majd válaszd a "Hozzáadás a Főképernyőhöz" lehetőséget.

## Offline működés és cache frissítése
- Az `sw.js` app-shell gyorsítótárba teszi az összes statikus fájlt, így a PWA offline is elindul.
- Ha módosítod az állományokat, növeld a `CACHE_VERSION` értékét az `sw.js` fájlban, hogy a következő betöltéskor frissüljön a cache.
