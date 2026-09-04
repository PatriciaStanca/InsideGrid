# Säkerhet och struktur

## Inspiration från tidigare projekt

`StancaBankApi` använder en tydlig .NET API-struktur med:

- `Application/DTOs`
- `Core/Services`
- `Data/Context`
- `Data/Entities`
- `Data/Repos`
- `Infrastructure/Auth`
- `Infrastructure/Security`
- tunna controllers
- JWT och rollbaserad auktorisering

CV-databasen är nu justerad åt samma håll med MVC controllers, service-lager, datalager och infrastructure-lager.

## Nuvarande lager

- `Controllers`: HTTP-yta. Ska vara tunn och bara mappa requests till services/repositories.
- `Core/Common`: gemensamt service-result pattern enligt Blog API:t.
- `Core/Services`: CV-, AI- och PDF-logik.
- `Data/DTOs`: request/response-kontrakt.
- `Data/Entities`: EF/databasentiteter.
- `Data/Interfaces`: repository-kontrakt.
- `Data/Repositories`: EF Core och in-memory repositories.
- `Data/Context`: EF Core DbContext.
- `Extensions`: service collection-registreringar enligt dina tidigare API:n.
- `Infrastructure/Ai`: OpenAI-klient.
- `Infrastructure/Security`: roller, policies, demo-auth, säkerhetsmiddleware och framtida auth-provider.

## Säkerhet som finns i kod nu

- JWT-inloggning med e-post och lösenord.
- Lösenord lagras hashade med PBKDF2-SHA256, salt och hög iterationsnivå.
- Login-endpoint: `POST /api/auth/login`.
- Admin kan skapa användare via `POST /api/auth/users`.
- Rollbaserade policies: `Employee`, `Manager`, `Admin`.
- Separata policies för läsning, skrivning och admin.
- Säkerhetsheaders:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Strict-Transport-Security` vid HTTPS
- Central felhantering med Problem Details.
- Rate limiting på AI-endpoints.
- JWT-signing key och andra secrets ska ligga i user-secrets, cloud app settings eller Key Vault, inte i koden.
- SQL aktiveras via connection string, annars används bara utvecklingsdata i minne.

## Viktigt innan riktig drift

Utvecklingskonton och dev-JWT-nyckel måste bytas bort innan verklig personaldata används.

Rekommenderat:

1. Microsoft Entra ID eller annan OIDC/JWT-provider.
2. Gruppbaserad rollmappning till `Employee`, `Manager`, `Admin`.
3. Auditlogg för CV-läsning, ändringar, AI-generering och PDF-export.
4. Databas-migrationer i stället för `EnsureCreated`.
5. Rate limits per användare/tenant.
6. PII-policy för vad som får skickas till AI.
7. Krypterade secrets i Azure Key Vault eller motsvarande.
8. Refresh tokens eller kortlivade sessionscookies om användarna ska vara inloggade länge.
