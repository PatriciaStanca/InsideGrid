# Databas och enkel cloud-start

## Rekommendation

Välj SQL som huvuddatabas. För den här produkten är PostgreSQL bäst som startval:

- Det är en riktig relationsdatabas för kandidater, roller, behörigheter, uppdrag och auditlogg.
- Det fungerar bra med .NET via EF Core.
- Det kan senare kompletteras med vektorsökning för AI-matchning.
- Det finns som managed databas i Azure, Neon, Supabase och andra tjänster.

MongoDB är möjligt, men jag skulle inte välja det som kärna här. Behörigheter, auditlogg, team, roller, CV-versioner och uppdrag blir tydligare och säkrare i SQL.

## Enkel start utan egen server

Min rekommenderade väg:

1. Skapa en managed PostgreSQL-databas, helst Azure Database for PostgreSQL Flexible Server om resten körs i Azure.
2. Lägg .NET API:t på Azure App Service.
3. Lägg React på Azure Static Web Apps eller bygg in den i samma App Service senare.
4. Lägg connection string som App Setting, inte i koden.
5. Lägg OpenAI-nyckel som secret/App Setting.
6. Byt demo-auth mot Microsoft Entra ID innan riktig personaldata används.

## Varför Azure?

För ett .NET/C#-system med inloggning, roller, AI och företagsdata är Azure den rakaste vägen:

- App Service är en managed PaaS för webappar.
- Azure Database for PostgreSQL Flexible Server är en managed databastjänst.
- Entra ID ger företagsinloggning och gruppbaserade roller.
- Azure OpenAI kan användas om organisationen kräver Microsoft/Azure-miljö.

## Databaskoppling i projektet

API:t väljer repository automatiskt:

- Ingen `ConnectionStrings:Default`: kör in-memory testdata.
- Med `ConnectionStrings:Default`: kör EF Core mot PostgreSQL.

Exempel:

```bash
dotnet user-secrets set "ConnectionStrings:Default" "Host=<host>;Database=cvdatabase;Username=<user>;Password=<password>;SSL Mode=Require" --project src/CvDatabase.Api
```

## Nästa kodsteg

1. Lägg till EF Core migrations.
2. Skapa tabeller i PostgreSQL.
3. Flytta seed-data till en riktig seed-process.
4. Lägg till tabeller för användare, roller, team, auditlogg och CV-versioner.
5. Lägg till embeddings-tabell eller extern vector search för AI-matchning.
