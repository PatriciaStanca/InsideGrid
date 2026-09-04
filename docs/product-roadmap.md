# Produkt-roadmap

## Positionering

Produkten ska vara ett CRM-liknande system för konsultbolag där kärnan är CV, kompetens, uppdrag och AI-stöd i säljprocessen.

Den ska inte försöka vara ett helt HR-system från start. Första versionen ska lösa ett smalt och värdefullt problem:

1. Hitta rätt konsult snabbt.
2. Se om personen är tillgänglig.
3. Anpassa CV:t mot en konkret kundannons.
4. Exportera ett snyggt och granskat CV på svenska eller engelska.

## Inspiration från marknaden

Cinode har publikt beskrivna funktioner inom konsultprofiler, kompetenser, uppdrag, matchning, CV-mallar, AI-stöd, textförbättring, översättning, skills-extraktion och CV-generering mot roll eller jobbeskrivning.

Det visar att marknaden finns, men också att produkten behöver vara tydligt differentierad. Vår vinkel ska vara snabbare och mer AI-fokuserad runt uppdragsannons till kundanpassat CV.

## Kärnflöde

1. Manager eller säljare klistrar in en uppdragsannons.
2. Systemet analyserar krav, teknik, roll, språk, senioritet, plats och startdatum.
3. Systemet matchar mot konsulternas kompetenser, projekt, roller, bransch och tillgänglighet.
4. Användaren får en shortlist med matchningspoäng, styrkor, risker och saknade krav.
5. Användaren väljer konsult och genererar ett anpassat CV.
6. CV:t kan skapas på svenska eller engelska.
7. Manager granskar och godkänner CV:t innan PDF-export.
8. Export och AI-generering loggas.

## Funktioner för MVP

- Inloggning med roller: Employee, Manager, Admin.
- Konsultprofiler med roll, presentation, språk, kompetenser, senioritet och tillgänglighet.
- Projekt/uppdrag per konsult med beskrivning, period, kund, roll och tekniker.
- Sökning i CV-databasen.
- Uppdragsannons in i systemet.
- AI-matchning eller lokal matchning mot kandidater.
- Förklarad matchning: varför kandidaten passar och vad som saknas.
- Generering av CV på svenska och engelska.
- PDF-export.
- Adminhantering av användare och roller.
- Auditlogg för visning, export och AI-generering.

## AI som ska göra produkten starkare

AI ska inte bara skriva text. Den ska stödja hela säljarbetet runt en uppdragsförfrågan.

### Annonsanalys

AI ska strukturera en uppdragsannons till:

- Roll
- Måste-krav
- Bör-krav
- Kompetenser
- Bransch
- Språk
- Senioritet
- Plats eller remote
- Startdatum
- Uppdragstyp

### Matchning

Matchningen ska returnera:

- Poäng 0-100
- Tillgänglighet
- Styrkor
- Risker
- Saknade krav
- Rekommenderad CV-vinkel
- Kort motivering som kan förstås av manager/säljare

### CV-gap

Systemet ska visa vad annonsen efterfrågar men kandidaten saknar i sitt registrerade CV.

AI får föreslå att verifierade erfarenheter lyfts fram, men får inte hitta på kompetenser eller projekt.

### Anpassat CV utan hallucinationer

CV-genereringen ska följa dessa regler:

- Använd bara verifierad profil- och projektdata.
- Prioritera relevanta projekt mot annonsen.
- Skriv om presentation och projektsammandrag för kunden.
- Lägg inte till erfarenhet som saknas.
- Markera osäkra förslag för manuell granskning.

### AI-chat mot databasen

Exempel på frågor:

- Vilka konsulter kan React, .NET och Azure och är lediga inom 30 dagar?
- Vilka passar bäst för den här annonsen?
- Vilka CV:n saknar uppdaterade projekt?
- Vilka kompetenser saknar vi jämfört med denna kundförfrågan?
- Skapa en shortlist med tre kandidater och motivering.

## CRM-liknande moduler senare

När MVP fungerar kan systemet växa mot ett lätt CRM för konsultaffärer:

- Kunder
- Kontakter
- Uppdragsförfrågningar
- Shortlists
- Skickade CV-versioner
- Status: ny, matchad, CV skickat, intervju, vunnen, förlorad
- Kommentarer och intern historik
- Pipeline per manager eller säljare
- Statistik över matchningsgrad, svarstid och vunna uppdrag

## Differentiering

Produkten ska inte positioneras som "ännu en CV-databas".

Bättre positionering:

"AI-verktyget som hjälper konsultbolag svara snabbare på uppdragsförfrågningar med rätt konsult och rätt CV."

Det viktigaste värdet är kortare tid från kundannons till färdig kandidatpresentation.
