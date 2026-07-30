PARIS AUTHENTIFIZIERUNG – FUNDAMENT V1
======================================

Enthalten:
- Zentrale Supabase-Konfiguration: auth/config.js
- Zentrale Session- und Auth-API: auth/session.js
- Konto-, Login- und Registrierungsoberfläche: auth/ui.js
- Neuer Bereich „Konto“ im Profilcenter
- Bestehende anonyme Anmeldung bleibt aktiv und kann dauerhaft gesichert werden
- E-Mail/Passwort-Anmeldung
- Registrierung mit Vorname, Nachname und Anzeigename
- E-Mail-Bestätigung über die in Supabase hinterlegte Redirect-URL
- Passwort vergessen und Passwort ändern
- Abmelden auf dem aktuellen Gerät
- Google- und Apple-Schaltflächen sowie Identitätsverknüpfung vorbereitet
- Supabase-Client wird nur noch zentral erzeugt und gemeinsam verwendet

WICHTIG VOR DEM TEST
--------------------
1. Supabase: Allow manual linking = EIN
2. Supabase: Allow anonymous sign-ins = vorerst EIN
3. Supabase: Email provider und Confirm email = EIN
4. Site URL und Redirect URL müssen auf die GitHub-Pages-Adresse zeigen.
5. Google und Apple funktionieren erst, nachdem die jeweiligen Provider in Supabase eingerichtet wurden.

SICHERER TESTABLAUF
-------------------
1. Die neue Version auf GitHub hochladen.
2. App auf dem bisher verwendeten iPhone öffnen.
3. Profil -> Konto öffnen.
4. „Anonymes Konto sichern“ ausfüllen.
5. Bestätigungsmail öffnen und zur App zurückkehren.
6. Erst nach erfolgreicher Bestätigung auf einem zweiten Gerät anmelden.

Bestehende Reiseinhalte werden nicht kopiert. Beim Sichern wird der aktuelle anonyme Supabase-Benutzer aktualisiert, wodurch seine bestehende Benutzer-ID und Reisezuordnung erhalten bleiben.
