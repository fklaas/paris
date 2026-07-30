PARIS-APP · SUPABASE-SYNCHRONISIERUNG
=====================================

Diese Version ist mit dem neuen Supabase-Projekt verbunden:
https://bsbvvikslbugkipdjrzs.supabase.co

Die vollständige Datenbank wird in einem einzigen Schritt eingerichtet:
SUPABASE-ERSTINSTALLATION-PARIS.sql

Bitte zuerst SUPABASE-START-HIER.txt lesen.

Die App verwendet ausschließlich den Publishable Key im Browser. Ein Secret-
oder service_role-Key darf niemals in die App-Dateien eingetragen werden.

Nach der Datenbankinstallation müssen in Supabase noch die Auth-URLs für die
spätere Webadresse gesetzt werden. Google und Apple bleiben deaktiviert, bis
die Provider separat eingerichtet wurden. E-Mail und Passwort reichen für den
ersten gemeinsamen Test von Fabian und Luisa aus.

Persönliche Geräteeinstellungen wie Testmodus, Hintergrund, Lautstärke und
Standortfreigabe bleiben teilweise lokal. Gemeinsame Reiseinhalte werden nach
erfolgreicher Anmeldung und Auswahl derselben Reise über Supabase synchronisiert.
