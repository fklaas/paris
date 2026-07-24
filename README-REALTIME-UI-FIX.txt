REALTIME-UI-FIX

Behoben:
- Realtime-Ereignisse rendern nicht mehr den gesamten Profil-Inhaltsbereich neu.
- Teilnehmeransicht erscheint nicht mehr in Meine Reisen, Synchronisation, Einstellungen oder anderen Profil-Tabs.
- Der Jetzt-gerade-Banner wird nur aktualisiert, wenn der Teilnehmer-Tab tatsächlich geöffnet ist.
- Teilnehmerstatus und Aktivitätsfeed werden innerhalb ihrer eigenen DOM-Bereiche aktualisiert.
- Kein Render-Loop durch Presence-Heartbeat oder neue Feed-Ereignisse.
- Service-Worker-Cache wurde angehoben, damit die korrigierte people-system.js sicher geladen wird.

Keine erneute SQL-Ausführung notwendig.
