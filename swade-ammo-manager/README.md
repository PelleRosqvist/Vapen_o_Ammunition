# SWADE Ammo Manager (v0.1.0)

Repo: https://github.com/PelleRosqvist/Vapen_o_Ammunition
Licens: MIT (se `LICENSE`) — fritt att använda, ändra och sprida vidare.

En liten, fristående Foundry VTT-modul för SWADE som hanterar ammunition per vapen:
räknar ner skott, hanterar magasin/snabbladdare/enstaka patroner, och gör tydligt
att omladdning förbrukar en handling.

Bygger **inte** på SWIM eller dess `flags.swim`-data — helt egen datamodell, så
den påverkas inte av att SWIM inte hålls uppdaterat.

## Installation

1. Kopiera hela mappen `swade-ammo-manager` till din Foundry `Data/modules/`-katalog
   (på Forge: ladda upp mappen via Setup → Add-on Modules → Install Module → "Manual").
2. Aktivera modulen i din värld under **Game Settings → Manage Modules**.

## Grundidé

- **Vapen-items** (`type: "weapon"`) får en ny knapp i sheet-headern: **Ammunition**.
  Där ställer du in:
  - **Laddningstyp**: Magasin / Enstaka patroner / Revolver (enstaka + snabbladdare)
  - **Max antal skott**, **nuvarande antal skott**, samt en fri **kaliber/typ**-tagg
    (t.ex. `.45 Long Colt`) som används för att matcha mot ammunition i lagret.
- **Alla andra items** (t.ex. Gear) får en knapp **Märk som ammunition**, där du
  anger:
  - **Typ**: Lösa patroner / Magasin / Snabbladdare
  - Samma **kaliber/typ**-tagg som på vapnet
  - **Kapacitet** (hur många skott ett magasin/snabbladdare ger vid omladdning)
  - Antalet i lager styrs av föremålets vanliga **Antal**-fält (`system.quantity`).

## Så fungerar de olika lägena

- **Magasin**: knappen "Byt magasin" konsumerar ett magasin-item med matchande
  kaliber och fyller vapnet till magasinets kapacitet. Kostar en handling.
- **Enstaka patroner**: knappen "Ladda 1 patron" konsumerar en lös patron och
  ökar antalet skott med 1. Varje klick = en handling, så en spelare som vill
  fylla en tom sexskotts-revolver klickar sex gånger (sex handlingar) — precis
  det du efterfrågade för äldre västernvapen.
- **Revolver**: kombinerar ovanstående — spelaren kan antingen ladda enstaka
  patroner (en handling per patron) eller använda en snabbladdare (en handling
  för att fylla hela cylindern), beroende på vad de har i utrustningen.

Varje omladdning postar ett chatt-meddelande som påminner om att den kostar en
handling. SWADE:s handlings-ekonomi är inte ett strikt "action point"-system i
grunden (multi-action-avdrag hanteras av spelsystemet/GM), så modulen
**loggar** handlingskostnaden i chatten snarare än att automatiskt dra av från
någon räknare — det finns ingen sådan räknare i SWADE-systemet att haka i.

## Medvetet vald teknisk lösning

Istället för att injicera UI direkt i SWADE:s vapen-sheet (vilket är precis det
som gjorde SWIM-integrationen skör mot egenbyggda vapen) använder modulen
Foundrys dokumenterade `getItemSheetHeaderButtons`-hook och en egen liten
dialogruta. Det gör den okänslig för att SWADE-systemet ändrar sin interna
sheet-HTML mellan versioner.

## Kända begränsningar / att testa vidare

- Byggd och testad mot Foundry V11–V13-manifestformatet, men jag har inte
  kunnat köra den live i din värld — testa i en kopia av världen först.
- Skjutning (nedräkning vid attack) sker manuellt via "Avfyra ett skott" i
  ammo-dialogen snarare än automatiskt vid vapnets attack-slag, eftersom SWADE-
  systemets interna roll-hooks inte är stabilt dokumenterade och jag inte
  ville gissa mig till samma typ av skört beroende som orsakade SWIM-buggen.
  Om du vill ha automatisk nedräkning vid attack kan vi undersöka det som
  nästa steg, gärna genom att du delar vad du ser i konsolen (F12) när du
  klickar vapnets attack-knapp.
- `{{eq}}`-hjälparen i mallen förutsätter Foundrys inbyggda jämförelse-helpers
  (finns sedan V10). Säg till om du kör äldre version.
