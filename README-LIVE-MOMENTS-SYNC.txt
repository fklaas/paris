PARIS LIVE MOMENTS – GEMEINSAME SYNCHRONISIERUNG

Synchronisiert wird ausschließlich der veränderliche Zustand der sechs fest im App-Code hinterlegten Orte:
- automatisch erkannt / ausgelöst
- gesehen
- bewusst über „Diesen Moment merken“ gesammelt
- Zeitpunkte und ausführender Benutzer
- vorbereitetes Feld für Favorit und verknüpftes Galerie-Foto

Nicht in Supabase gespeichert werden:
- GPS-Koordinaten und Radien
- Ortsnamen, Fakten, Fototipps, französische Sätze und Übersetzungen
- Reisephasen und Darstellungslogik

Technik:
- Tabelle public.live_moment_status aus der bereits ausgeführten Hauptmigration
- Supabase als verbindlicher gemeinsamer Stand
- Realtime plus automatischer Abgleich alle 2 Sekunden bei sichtbarer App
- Abgleich nach Fokus, Standby und Rückkehr zur App
- einmalige Übernahme vorhandener lokaler gespeicherter Ortsmomente
- die alte parallele Synchronisierung über public.live_moments ist deaktiviert

Es ist keine neue SQL-Ausführung nötig, sofern PARIS-STEP-1-DATABASE-MIGRATION.sql bereits vollständig erfolgreich ausgeführt wurde.
