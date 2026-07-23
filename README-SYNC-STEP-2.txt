PARIS-APP – SCHRITT 2 + GALERIE

Neu:
- Zentraler Namensraum window.ParisSync
- Gemeinsames Auth-/Trip-Fundament über sync/core.js
- Galerie-Datenzugriff ausschließlich über sync/gallery.js
- Foto-Upload in Supabase Storage
- Metadaten: Dateiname, MIME-Type, Dateigröße, Beschreibung, Favorit, Polaroid, Aufnahmezeit
- Realtime-Aktualisierung auf dem zweiten Gerät
- Löschen entfernt Datenbankeintrag und Storage-Datei
- Bestehende lokale Galerie wird einmalig in die Cloud übernommen

Bestehende Tagesnotizen und alte Module laufen vorerst weiter über die bisherige Kompatibilitätsschicht.
