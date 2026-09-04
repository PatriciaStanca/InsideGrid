# InsideGrid

Enterprise-inriktad CV- och kompetensdatabas byggd med .NET 9 API och React/Vite-klient.

Målbilden är ett CRM-liknande system för konsultbolag där uppdragsförfrågningar, kompetenser, tillgänglighet, AI-matchning och kundanpassade CV:n hänger ihop.

Slogan: **Know who fits before you pitch.**

## Kör backend

```bash
dotnet run --project src/CvDatabase.Api --urls http://127.0.0.1:5099
```

Utan connection string kör API:t med in-memory testdata. För riktig SQL-databas, sätt `ConnectionStrings:Default`.

```bash
dotnet user-secrets set "ConnectionStrings:Default" "Host=...;Database=cvdatabase;Username=...;Password=...;SSL Mode=Require" --project src/CvDatabase.Api
```

Lokal databas med Docker:

```bash
docker compose up -d postgres
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Port=5432;Database=cvdatabase;Username=cvdatabase;Password=cvdatabase_dev_password" --project src/CvDatabase.Api
```

Starta sedan om API:t. Utan connection string används fortfarande in-memory-data.

API:t använder JWT-inloggning med e-post och lösenord.

Utvecklingskonton:

- `admin@cvdatabase.local` / `Admin123!`
- `manager@cvdatabase.local` / `Manager123!`
- `employee@cvdatabase.local` / `Employee123!`

Logga in:

```bash
curl -X POST http://127.0.0.1:5099/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@cvdatabase.local","password":"Manager123!"}'
```

Skicka sedan token som:

```text
Authorization: Bearer <accessToken>
```

I produktion ska testkonton tas bort, JWT-nyckeln flyttas till secrets/Key Vault och helst ersättas med Microsoft Entra ID eller annan OIDC-provider.

## Kör frontend

```bash
cd src/CvDatabase.Web
npm install
npm run dev
```

Öppna `http://127.0.0.1:5173`.

## OpenAI

Sätt API-nyckeln som user secret eller miljövariabel. Lägg inte nyckeln i git.

```bash
dotnet user-secrets init --project src/CvDatabase.Api
dotnet user-secrets set "OpenAI:ApiKey" "din-nyckel" --project src/CvDatabase.Api
```

Utan nyckel fungerar appen med lokal matchning och lokal CV-mall.

## Viktiga endpoints

- `GET /api/candidates`
- `POST /api/candidates`
- `GET /api/candidates/{id}/cv.pdf`
- `POST /api/auth/login`
- `POST /api/auth/users`
- `POST /api/ai/match`
- `POST /api/ai/generate-cv`

## Kodstruktur

API:t följer samma riktning som dina tidigare .NET API:n:

```text
src/CvDatabase.Api/
  Controllers/             # Tunna HTTP-controllers
  Core/
    Common/                # ServiceResult och gemensam core-hjälp
    Services/              # CV-, AI- och PDF-logik
  Data/
    Context/               # EF Core DbContext
    DTOs/                  # API-kontrakt/DTOs
    Entities/              # Databasentiteter
    Interfaces/            # Repository-kontrakt
    Repositories/          # EF/in-memory repositories
  Extensions/              # ServiceCollection-registreringar
  Infrastructure/
    Ai/                    # OpenAI-klient
    Security/              # Roller, policies, demo-auth och säkerhetsheaders
```

Nästa större refaktor kan dela ut `Core`, `Data` och `Infrastructure` till separata projekt om lösningen växer.

## Nästa produktionssteg

- Skapa EF Core-migrationer för PostgreSQL och kör dem mot cloud-databasen.
- Lägg till Microsoft Entra ID, grupper och riktiga roller.
- Lägg till auditlogg för CV-visningar, ändringar, AI-genereringar och PDF-export.
- Lägg till filuppladdning och parser för befintliga CV:n.
- Lägg till vektorsökning för semantisk matchning över kompetenser och projekt.
- Lägg till uppdragsförfrågningar, shortlist, CV-versioner och CRM-statusar.

Se även:

- [Arkitektur](docs/architecture.md)
- [Produkt-roadmap](docs/product-roadmap.md)
- [Databas och molnstart](docs/database-and-cloud-start.md)
- [Säkerhet och struktur](docs/security-and-structure.md)

## Enklaste drift utan egen server

Rekommenderad start:

1. Azure App Service för .NET API:t.
2. Azure Static Web Apps eller App Service för React-klienten.
3. Azure Database for PostgreSQL Flexible Server som managed SQL-databas.
4. Microsoft Entra ID för inloggning och roller.
5. OpenAI API eller Azure OpenAI för AI-matchning.

## Portfolio deployment

Frontendens API-adress kan sättas med `VITE_API_BASE_URL`. Det gör att React-klienten kan publiceras separat från .NET-API:t och bäddas in på `patriciastanca.com/insidegrid`.

Portfoliosidan ska länka eller bädda in den publicerade klienten. Då behöver ingen källkod kopieras till det publika portfolio-repot, och nya versioner av InsideGrid kan publiceras från det privata repot.

Det här betyder att du inte driftar en egen server. Azure tar hand om patchning, HTTPS, skalning och databastjänsten.
