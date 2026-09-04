# Arkitektur

## Målbild

CV-databasen ska stödja tre huvudsakliga arbetsflöden:

1. Medarbetare söker och läser kollegors profiler, kompetenser och tillgänglighet.
2. Chefer och administratörer hanterar profiler, behörigheter och bemanning.
3. AI matchar uppdragsannonser mot kandidater och skapar anpassade CV:n på svenska eller engelska.

Produktmässigt ska systemet växa mot ett CRM-liknande verktyg för konsultaffärer där uppdragsförfrågningar, shortlist, CV-versioner, kundexport och status hänger ihop. Se [produkt-roadmap](product-roadmap.md).

## Rekommenderad stack

- Backend: ASP.NET Core / .NET 9
- Frontend: React med Vite och TypeScript
- Databas: SQL Server på Azure SQL eller PostgreSQL
- Auth: Microsoft Entra ID med OIDC/JWT och gruppbaserade roller
- AI: OpenAI Responses API för chat, matchning och CV-generering
- Sök: relationssök + embeddings/vector search för semantisk matchning
- PDF: servergenerering med en riktig PDF-renderare i produktion

## Roller

- `Employee`: kan läsa CV-profiler, söka och hämta PDF.
- `Manager`: kan skapa och ändra profiler, skapa uppdragsmatchningar och CV-förslag.
- `Admin`: kan hantera användare, roller, radering och systeminställningar.

## Säkerhetskrav

- All trafik via HTTPS.
- Riktig OIDC/JWT-auth i produktion.
- Roll- och resursbaserad auktorisering.
- Auditlogg för läsning av CV, ändringar, AI-frågor och PDF-export.
- Rate limiting på AI-endpoints.
- PII-minimering i prompts.
- Kryptering av secrets via Key Vault eller motsvarande.
- Separat policy för vem som får se privata anteckningar.
- Manuell granskning innan AI-genererat CV skickas till kund.

## AI-flöde

1. Användaren klistrar in en uppdragsannons.
2. Systemet strukturerar annonsen till roll, krav, kompetenser, språk, plats, senioritet och startdatum.
3. Systemet söker fram kandidater via kompetensord, tillgänglighet och erfarenhet.
4. AI får begränsad kandidatdata och annonsen.
5. AI returnerar matchning, luckor, risker och resonemang.
6. Användaren väljer kandidat och genererar ett anpassat CV.
7. CV:t granskas innan export.

OpenAI-dokumentationen rekommenderar Responses API för moderna textgenereringsflöden och strukturerade outputs när applikationen behöver maskinläsbara svar. Embeddings passar för semantisk sökning där exakt ordmatchning inte räcker.
