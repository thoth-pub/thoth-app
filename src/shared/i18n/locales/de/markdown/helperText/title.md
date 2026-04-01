# Titel

Dieser Bereich verwaltet den **Titel** (Pflichtfeld), den **Untertitel** und die **Ausgabe** des Werks. Der **Titel** wird bereits während des Einrichtungsprozesses festgelegt.

Im Bearbeitungsmodus können die folgenden Felder bearbeitet werden:

- **Titel**: Texteingabe für den Titel des Werks.
- **Untertitel**: Texteingabe für den Untertitel des Werks, üblicherweise durch einen Doppelpunkt vom Titel getrennt.
- **Ausgabe**: Ganzzahleingabe für die Ausgabe des Werks. Die Standardausgabennummer ist „1"; jede andere Ganzzahl ist ebenfalls zulässig.

> „Eine Ausgabe eines bestimmten Werks umfasst in der Regel alle Exemplare des Werks, die denselben Inhalt aufweisen und (meistens) vom selben Verlag hergestellt wurden. Die verlegerische Kennzeichnung einer bestimmten oder eigenständigen Ausgabe kann auf inhaltliche Änderungen (Ergänzung, Überarbeitung oder Entfernung von Inhalten) zurückzuführen sein oder Produkte bezeichnen, die für einen bestimmten Markt hergestellt wurden. Es ist wichtig zu beachten, dass einige Ausgaben, wie etwa zweite, gekürzte oder kommentierte Ausgaben, vollständig neue Werke sein können; andere können denselben Inhalt aufweisen, werden jedoch als andere Ausgabe eingestuft, wie etwa eine Großdruckausgabe" (BISG, *Revised Best Practices for Book Metadata,* 93).

## JATS XML

Sowohl **Titel** als auch **Untertitel** unterstützen die JATS-XML-Formatierung für Fettschrift, Kursivschrift, Durchgestrichen und Unterstrichen.

- [Fettschrift](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/bold.html): `<bold>Text</bold>`
- [Kursivschrift](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/italic.html): `<italic>Text</italic>`
- [Durchgestrichen](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/strike.html): `<strike>Text</strike>`
- [Unterstrichen](https://jats.nlm.nih.gov/archiving/tag-library/1.4/element/underline.html): `<underline>Text</underline>`

## Mehrsprachige Optionen

Das **Sprache**-Dropdown ermöglicht die Festlegung der Sprache für **Titel** und **Untertitel**. Die Liste der zulässigen Sprachen und Sprachvarianten umfasst einen zweistelligen [ISO 639-1](https://www.loc.gov/standards/iso639-2/php/code_list.php)-Sprachcode gefolgt von einem zweistelligen [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes)-Ländercode.

Die Schaltfläche **Neue Übersetzung hinzufügen** ermöglicht das Hinzufügen einer Übersetzung von **Titel** und **Untertitel** in einer anderen Sprache.
