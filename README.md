# Project Zomboid Dedicated Server Control Center (GUI)

Egy modern, látványos és funkciókban gazdag grafikus kezelőfelület (GUI) **Project Zomboid Dedicated Szerverekhez** mind **Windows**, mind **Linux** rendszerekre.

---

## Főbb Funkciók

### 1. Keresztplatformos Működés (Windows & Linux)
- **Automatikus Platformfelismerés:** A rendszer automatikusan észleli az operációs rendszert (`Windows` vagy `Linux`/`macOS`).
- **Platformspecifikus SteamCMD letöltés:**
  - **Windows:** Letölti és kicsomagolja a `steamcmd.zip` archívumot (`steamcmd.exe`).
  - **Linux:** Letölti és kicsomagolja a `steamcmd_linux.tar.gz` archívumot (`steamcmd.sh`), beállítva a megfelelő futtatási jogosultságokat (`chmod +x`).
- **Keresztplatformos Szerver Indítás:**
  - **Windows:** `StartServer64.bat` vagy `ProjectZomboid64.exe`.
  - **Linux:** `start-server.sh` vagy `ProjectZomboid64` natív bináris automatikus jogosultság-kezeléssel.
- **Keresztplatformos Útvonalak:** Automatikusan kezeli a `%USERPROFILE%\Zomboid` (Windows) és `~/Zomboid` (Linux) mappákat.

### 2. Steam Workshop és Mod Kezelő (Kiemelt Mod Manager)
- **Workshop ID / URL hozzáadása:** Steam Workshop link vagy számszerű ID beillesztése (pl. `2875848298`).
- **Automatikus Metaadat Lekérés:** Letölti a címet, előnézeti borítóképet, készítőt, leírást és belső `Mod ID`-kat.
- **Több Mod ID kezelése:** Ha egy workshop elem több modot tartalmaz (pl. *Brita's Weapon Pack*, *Authentic Z*, *Tsar's Common Library*), az egyes belső Mod ID-k külön be- és kikapcsolhatók.
- **Sorrend / Betöltési Prioritás (Drag & Drop):** Húzd és ejtsd módszerrel vagy a fel/le nyilakkal tetszőlegesen módosítható a modok betöltési sorrendje.
- **Tömeges hozzáadás (Batch Add):** Egyszerre több Workshop ID bemásolása és párhuzamos lekérése.
- **Automata szinkronizáció a szerverrel:** Egy kattintással frissíti a szerver konfigurációját (`Mods=...` és `WorkshopItems=...`).
- **Mod Preset Export & Import:** Modlista mentése/betöltése JSON fájlból vagy közvetlen importálás a meglévő `<SzerverNév>.ini`-ből.

### 3. Élő Interaktív Szerver Konzol (Live Console)
- Valós idejű WebSocket konzol stream színes naplózással.
- Interaktív parancsbevitel előzményekkel (Fel/Le nyilak).
- Gyorsgombok: `save` (világ mentése), `players` (játékoslista), `broadcast` (játékon belüli felugró üzenet), `help`, `quit`.
- Szerver indítás, graceful leállítás és újraindítás.

### 4. Vizuális Szerver Konfiguráció (.ini és Sandbox)
- Áttekinthető, lapokra bontott szerkesztő (Általános, Biztonság, Portok, PvP & Játékmenet, Safehouse bunkerek, Loot respawn).

### 5. Biztonsági Mentések (Backups)
- 1-kattintásos zip mentés a multiplayer világról, adatbázisokról és konfigurációkról, visszaállítási lehetőséggel.

---

## Indítás és Használat

### Windows alatt
Kattints duplán a **`start.bat`** fájlra, vagy futtasd parancssorban:
```cmd
start.bat
```

### Linux alatt
Tedd futtathatóvá és indítsd el a **`start.sh`** szkriptet:
```bash
chmod +x start.sh
./start.sh
```

A grafikus felület a böngészőben érhető el:
👉 **`http://localhost:3001`** (a start szkriptek automatikusan megnyitják a böngészőt).

> **Linux Megjegyzés:** 64-bites Linux disztribúciókon (Debian/Ubuntu) a SteamCMD-hez szükséges lehet a 32-bites könyvtárak jelenléte:
> `sudo apt update && sudo apt install -y lib32gcc-s1` (vagy régebbi rendszereken `lib32gcc1`).
