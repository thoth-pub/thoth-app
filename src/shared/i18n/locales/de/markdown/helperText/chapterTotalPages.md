# Seitenbereich

Dieser Bereich verwaltet die **Gesamtseitenanzahl** sowie die **Erste Seite** und die **Letzte Seite**.

Im Bearbeitungsmodus können die folgenden Felder bearbeitet werden:

- **Gesamtseitenanzahl**: Ganzzahleingabe für die Gesamtanzahl der Seiten des Kapitels.
- **Erste Seite**: Texteingabe für die erste Seite des Kapitels.
- **Letzte Seite**: Texteingabe für die letzte Seite des Kapitels.

Für die erste und die letzte Seite sind drei Nummerierungsarten zulässig:

- **Zahlen**, zum Beispiel `1`–`20`.
- **Römische Zahlen**, zum Beispiel `I`–`XI`.
- **Seiten mit Präfix**: ein Präfix, direkt gefolgt von einer positiven Seitenzahl, zum Beispiel `A8`–`A18` oder `III3`–`III6`. Das Präfix ist entweder ein einzelner Großbuchstabe (`A`) oder eine gültige römische Zahl in Großbuchstaben (`III`); andere Präfixe sind nicht zulässig. Das Präfix kann auch nur einmal angegeben werden: `A8`–`18` oder `III3`–`6`.

Beide Seiten müssen dieselbe Nummerierung verwenden – auf eine erste Seite mit Präfix darf eine reine Zahl folgen, das Präfix darf sich jedoch nicht ändern (`III3`–`IV6` ist kein gültiger Bereich) – und die letzte Seite darf nicht vor der ersten liegen. Gezählt wird nur die Seitenzahl nach dem Präfix: `III3`–`III6` umfasst 4 Seiten. Die Seitenangaben werden genau so gespeichert, wie sie eingegeben wurden; die Gesamtseitenanzahl wird bei einem vollständigen Bereich automatisch berechnet.
