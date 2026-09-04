using CvDatabase.Api.Data.DTOs;
using CvDatabase.Api.Data.Interfaces;
using CvDatabase.Api.Infrastructure.Ai;

namespace CvDatabase.Api.Core.Services;

public sealed class CvAssistantService(ICandidateRepository repository, OpenAiCvAssistant openAi)
{
    public async Task<JobMatchResponse> MatchJobAsync(JobMatchRequest request, CancellationToken cancellationToken)
    {
        var analysis = AnalyzeJobAdvertisement(request.JobAdvertisement);
        var candidates = await repository.SearchAsync(null, null, null, cancellationToken);
        var ranked = candidates
            .Select(candidate => ScoreCandidate(candidate, analysis))
            .OrderByDescending(result => result.Score)
            .ThenBy(result => result.Availability == "Tillgänglig" ? 0 : 1)
            .Take(Math.Clamp(request.MaxCandidates, 1, 20))
            .ToArray();

        if (openAi.IsConfigured)
        {
            var enriched = await openAi.MatchCandidatesAsync(request, candidates, cancellationToken);
            if (enriched.Candidates.Count > 0)
            {
                return enriched;
            }
        }

        var bestScore = ranked.FirstOrDefault()?.Score ?? 0;
        var summary = bestScore switch
        {
            >= 50 => $"Lokal matchning för {analysis.Role.ToLowerInvariant()} baserad på krav, kompetenser, roll, språk och tillgänglighet.",
            >= 35 => $"Delvis matchning för {analysis.Role.ToLowerInvariant()}. Granska CV-gap och senioritetsnivå innan ansökan.",
            _ => "Inga starka matchningar hittades i CV-databasen. Annonsen verkar kräva kompetenser som inte finns tydligt registrerade på kandidaterna."
        };

        return new JobMatchResponse(
            summary,
            analysis,
            ranked);
    }

    public async Task<TailoredCvResponse> GenerateTailoredCvAsync(TailoredCvRequest request, CancellationToken cancellationToken)
    {
        var candidate = await repository.FindAsync(request.CandidateId, cancellationToken)
            ?? throw new InvalidOperationException("Kandidaten hittades inte.");

        if (openAi.IsConfigured)
        {
            var aiResponse = await openAi.GenerateTailoredCvAsync(new OpenAiCandidateContext(candidate, request.JobAdvertisement, request.Language), cancellationToken);
            if (!string.IsNullOrWhiteSpace(aiResponse.Markdown))
            {
                return aiResponse;
            }
        }

        var analysis = AnalyzeJobAdvertisement(request.JobAdvertisement);
        var keywords = analysis.Keywords;
        var matchingSkills = candidate.Skills
            .Where(skill => keywords.Any(keyword => skill.Contains(keyword, StringComparison.OrdinalIgnoreCase) || keyword.Contains(skill, StringComparison.OrdinalIgnoreCase)))
            .ToArray();
        var selectedProjects = candidate.Projects
            .OrderByDescending(project => project.Technologies.Count(technology => matchingSkills.Contains(technology, StringComparer.OrdinalIgnoreCase)))
            .ThenByDescending(project => project.EndDate ?? DateOnly.MaxValue)
            .Take(3)
            .ToArray();
        var missing = analysis.Technologies
            .Where(keyword => !BuildCandidateTerms(candidate).Any(term => IsMeaningfulTermMatch(term, keyword)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(8)
            .ToArray();
        var reviewNotes = ExtractReviewNotes(request.JobAdvertisement);

        var markdown = $"""
        # {candidate.Name}

        **{candidate.Title}**  
        {candidate.Location} | {string.Join(", ", candidate.Languages)}

        ## Profil
        {candidate.Summary}

        ## Matchning mot uppdraget
        Kandidaten matchar särskilt på: {string.Join(", ", matchingSkills.DefaultIfEmpty("relevant erfarenhet"))}.

        ## CV-gap att granska
        {string.Join("\n", missing.Select(keyword => $"- Annonsen nämner {keyword}, men det finns inte tydligt verifierat i profilen."))}

        ## Granskningsnoteringar
        {(string.IsNullOrWhiteSpace(reviewNotes) ? "- Inga manuella gap-beslut har lagts till." : reviewNotes)}

        ## Kompetenser
        {string.Join(", ", candidate.Skills)}

        ## Utvalda projekt
        {string.Join("\n\n", selectedProjects.Select(project => $"- **{project.Customer}**, {project.Role}: {project.Description} ({string.Join(", ", project.Technologies)})"))}
        """;

        return new TailoredCvResponse(
            candidate.Id,
            request.Language,
            markdown,
            matchingSkills,
            [
                "AI-nyckel saknas, så texten är genererad med lokal mall och bör granskas manuellt.",
                "CV:t får bara förstärka verifierad erfarenhet. Lägg inte till saknade kompetenser utan att kandidaten bekräftar dem."
            ]);
    }

    private static string ExtractReviewNotes(string jobAdvertisement)
    {
        const string marker = "Interna CV-granskningsnoteringar:";
        var markerIndex = jobAdvertisement.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex < 0)
        {
            return "";
        }

        return jobAdvertisement[(markerIndex + marker.Length)..].Trim();
    }

    private static CandidateMatchResult ScoreCandidate(CandidateProfile candidate, JobAdvertisementAnalysis analysis)
    {
        var keywords = analysis.Keywords;
        var candidateTerms = BuildCandidateTerms(candidate);
        var matchingSkills = candidate.Skills
            .Where(skill => MatchesAnyKeyword(skill, keywords))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var roleMatches = keywords.Count(keyword => candidateTerms.Any(term => IsMeaningfulTermMatch(term, keyword)));
        var languageMatches = analysis.Languages.Count(language => candidate.Languages.Any(candidateLanguage => IsMeaningfulTermMatch(candidateLanguage, language)));
        var projectTechnologyMatches = candidate.Projects
            .SelectMany(project => project.Technologies)
            .Count(technology => MatchesAnyKeyword(technology, analysis.Technologies));
        var totalMatches = matchingSkills.Length + roleMatches;

        var score = totalMatches == 0
            ? 0
            : Math.Clamp(
                (matchingSkills.Length * 16)
                + (roleMatches * 6)
                + (languageMatches * 5)
                + (projectTechnologyMatches * 4)
                + Math.Min(candidate.ExperienceYears, 10) * 2,
                0,
                100);

        if (score > 0 && !candidate.Availability.Equals("Tillgänglig", StringComparison.OrdinalIgnoreCase))
        {
            score = Math.Max(0, score - 30);
        }

        if (score > 0 && analysis.IsLinkOnly && matchingSkills.Length > 0)
        {
            score = Math.Min(100, score + 15);
        }

        var missing = analysis.Technologies
            .Where(keyword => !candidateTerms.Any(term => IsMeaningfulTermMatch(term, keyword)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(8)
            .ToArray();

        if (score > 0 && missing.Length >= 6)
        {
            score = Math.Min(score, 82);
        }
        else if (score > 0 && missing.Length >= 4)
        {
            score = Math.Min(score, 88);
        }

        var strongSignals = BuildStrongSignals(candidate, matchingSkills, analysis, languageMatches);
        var risks = BuildRisks(candidate, missing, analysis);
        var gaps = missing
            .Select(keyword => $"Annonsen nämner {keyword}, men det finns inte tydligt verifierat i kandidatens CV.")
            .ToArray();
        var suggestedCvVersion = SuggestCvVersion(analysis, candidate);
        var recommendedActions = BuildRecommendedActions(candidate, missing, analysis, suggestedCvVersion);

        return new CandidateMatchResult(
            candidate.Id,
            candidate.Name,
            candidate.Title,
            candidate.Availability,
            score,
            matchingSkills,
            missing,
            score == 0
                ? "Ingen tydlig kompetensmatch mot annonsen."
                : candidate.Availability.Equals("Tillgänglig", StringComparison.OrdinalIgnoreCase)
                ? "Bra kompetensmatch och markerad som tillgänglig."
                : $"Kompetensmatch finns, men kandidaten är markerad som {candidate.Availability.ToLowerInvariant()}.",
            strongSignals,
            risks,
            gaps,
            suggestedCvVersion,
            recommendedActions);
    }

    private static JobAdvertisementAnalysis AnalyzeJobAdvertisement(string jobAdvertisement)
    {
        var link = ExtractLinkContext(jobAdvertisement);
        var baseText = RemoveUrls(jobAdvertisement);
        var analysisText = string.Join('\n', new[]
            {
                baseText,
                link.RoleHint,
                link.LocationHint
            }
            .Where(value => !string.IsNullOrWhiteSpace(value)));
        var lines = analysisText
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(line => line.Length > 2 && !IsPageNoiseLine(line))
            .ToArray();
        var keywords = ExtractKeywords(analysisText);
        var technologies = keywords
            .Where(IsLikelyTechnology)
            .Take(20)
            .ToArray();
        var mustRequirements = ExtractRequirementLines(lines, ["krav", "måste", "must", "required", "erfarenhet av", "vad vi söker"]);
        var shouldRequirements = ExtractRequirementLines(lines, ["meriterande", "bör", "plus", "nice to have", "fördel"]);
        var languages = ExtractLanguages(analysisText);
        var companyName = ExtractCompanyName(lines, analysisText, link.SourceName);
        var recruitingCompany = ExtractRecruitingCompany(lines, analysisText, companyName);
        var contactEmails = ExtractContactEmails(analysisText);
        var contactNames = ExtractContactNames(lines);

        return new JobAdvertisementAnalysis(
            ExtractRole(lines, keywords, link.RoleHint),
            link.SourceName,
            link.Url,
            link.IsLinkOnly,
            companyName,
            recruitingCompany,
            contactNames,
            contactEmails,
            mustRequirements,
            shouldRequirements,
            technologies,
            ExtractIndustry(analysisText),
            languages,
            ExtractSeniority(analysisText),
            ExtractLocation(analysisText, link.LocationHint),
            ContainsAny(analysisText, ["remote", "distans", "hybrid", "hemifrån"]),
            null,
            ExtractAssignmentType(analysisText),
            keywords);
    }

    private sealed record LinkContext(string Url, string SourceName, string RoleHint, string LocationHint, bool IsLinkOnly);

    private static LinkContext ExtractLinkContext(string text)
    {
        var match = System.Text.RegularExpressions.Regex.Match(text, @"https?://[^\s]+", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (!match.Success || !Uri.TryCreate(match.Value.TrimEnd('.', ',', ')', ']'), UriKind.Absolute, out var uri))
        {
            return new LinkContext("", "", "", "", false);
        }

        var sourceName = ToSourceName(uri.Host);
        var roleHint = TryGetQueryValue(uri.Query, "q");
        var locationHint = TryGetQueryValue(uri.Query, "l");
        var withoutUrl = text.Replace(match.Value, "", StringComparison.OrdinalIgnoreCase).Trim();

        return new LinkContext(
            uri.ToString(),
            sourceName,
            roleHint,
            locationHint,
            string.IsNullOrWhiteSpace(withoutUrl));
    }

    private static string ToSourceName(string host)
    {
        var normalizedHost = host.Replace("www.", "", StringComparison.OrdinalIgnoreCase).ToLowerInvariant();
        if (normalizedHost.Contains("indeed")) return "Indeed";
        if (normalizedHost.Contains("linkedin")) return "LinkedIn";
        if (normalizedHost.Contains("arbetsformedlingen")) return "Arbetsförmedlingen";
        if (normalizedHost.Contains("monster")) return "Monster";
        return normalizedHost;
    }

    private static string TryGetQueryValue(string query, string key)
    {
        foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var pair = part.Split('=', 2);
            if (pair.Length == 2 && pair[0].Equals(key, StringComparison.OrdinalIgnoreCase))
            {
                return Uri.UnescapeDataString(pair[1].Replace('+', ' ')).Trim();
            }
        }

        return "";
    }

    private static string RemoveUrls(string text)
    {
        return System.Text.RegularExpressions.Regex.Replace(text, @"https?://[^\s]+", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
    }

    private static string ExtractCompanyName(IReadOnlyList<string> lines, string text, string sourceName)
    {
        var known = new[] { "Deer Data AB", "Deerdata", "Signific", "Data Edge AB", "Länsförsäkringar", "Agria Vet Guide", "Agria" };
        var knownMatch = known.FirstOrDefault(company => text.Contains(company, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(knownMatch))
        {
            return knownMatch;
        }

        var sourceIndex = Array.FindIndex(lines.ToArray(), line => !string.IsNullOrWhiteSpace(sourceName) && line.Contains(sourceName, StringComparison.OrdinalIgnoreCase));
        if (sourceIndex > 0)
        {
            var candidate = lines[sourceIndex - 1];
            if (LooksLikeCompanyLine(candidate))
            {
                return CleanCompanyLine(candidate);
            }
        }

        for (var index = 0; index < Math.Min(lines.Count, 8); index++)
        {
            if (LooksLikeCompanyLine(lines[index]))
            {
                return CleanCompanyLine(lines[index]);
            }
        }

        return "";
    }

    private static string ExtractRecruitingCompany(IReadOnlyList<string> lines, string text, string companyName)
    {
        foreach (var line in lines)
        {
            var marker = "Hos oss på ";
            var markerIndex = line.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (markerIndex >= 0)
            {
                var value = line[(markerIndex + marker.Length)..];
                var endIndex = value.IndexOf(" får", StringComparison.OrdinalIgnoreCase);
                return CleanCompanyLine(endIndex > 0 ? value[..endIndex] : value);
            }
        }

        if (text.Contains("Agria Vet Guide", StringComparison.OrdinalIgnoreCase))
        {
            return "Agria Vet Guide";
        }

        return companyName;
    }

    private static IReadOnlyList<string> ExtractContactEmails(string text)
    {
        return System.Text.RegularExpressions.Regex
            .Matches(text, @"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", System.Text.RegularExpressions.RegexOptions.IgnoreCase)
            .Select(match => match.Value)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(10)
            .ToArray();
    }

    private static IReadOnlyList<string> ExtractContactNames(IReadOnlyList<string> lines)
    {
        var names = new List<string>();
        foreach (var line in lines)
        {
            if (line.Contains("Kontaktperson", StringComparison.OrdinalIgnoreCase))
            {
                var cleaned = line
                    .Replace("Rekryterande chef:", "", StringComparison.OrdinalIgnoreCase)
                    .Replace("Facklig representant Forena:", "", StringComparison.OrdinalIgnoreCase)
                    .Replace("Facklig representant Akademikerföreningen:", "", StringComparison.OrdinalIgnoreCase)
                    .Replace("Kontaktpersoner", "", StringComparison.OrdinalIgnoreCase)
                    .Replace("Kontaktperson", "", StringComparison.OrdinalIgnoreCase)
                    .Trim(' ', ':', '-', '|');

                if (cleaned.Contains('@'))
                {
                    cleaned = cleaned.Split('@')[0].Replace('.', ' ');
                }

                if (cleaned.Contains('|'))
                {
                    cleaned = cleaned.Split('|')[0];
                }

                if (!string.IsNullOrWhiteSpace(cleaned) && cleaned.Length <= 80)
                {
                    names.Add(ToTitleCase(cleaned));
                }
            }
        }

        foreach (var email in ExtractContactEmails(string.Join('\n', lines)))
        {
            var localPart = email.Split('@')[0].Replace('.', ' ').Replace('_', ' ').Replace('-', ' ');
            if (localPart.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length >= 2)
            {
                names.Add(ToTitleCase(localPart));
            }
        }

        return names
            .Where(name => name.Length > 3)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(8)
            .ToArray();
    }

    private static bool LooksLikeCompanyLine(string line)
    {
        if (line.Length is < 2 or > 80) return false;
        if (line.Any(char.IsDigit)) return false;
        if (IsPageNoiseLine(line)) return false;
        if (LooksLikeRoleLine(line)) return false;
        if (ContainsAny(line, ["job post", "stjärnor", "stockholm", "ort", "förmåner", "fullständig", "kontaktperson", "ansökan"])) return false;
        return line.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length <= 5
            && line.Any(char.IsUpper);
    }

    private static string CleanCompanyLine(string value)
    {
        return value
            .Replace("&nbsp;", "", StringComparison.OrdinalIgnoreCase)
            .Trim(' ', '.', ',', ':', '-', '|');
    }

    private static string ToTitleCase(string value)
    {
        return string.Join(' ', value
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Length == 0 ? part : char.ToUpperInvariant(part[0]) + part[1..].ToLowerInvariant()));
    }

    private static IReadOnlyList<string> ExtractRequirementLines(IReadOnlyList<string> lines, IReadOnlyList<string> markers)
    {
        return lines
            .Where(line => !IsPageNoiseLine(line) && markers.Any(marker => line.Contains(marker, StringComparison.OrdinalIgnoreCase)))
            .Select(line => line.Length > 160 ? string.Concat(line.AsSpan(0, 157), "...") : line)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(8)
            .ToArray();
    }

    private static bool IsPageNoiseLine(string line)
    {
        return ContainsAny(line, [
            "skapa ett indeed-konto",
            "start på huvudinnehåll",
            "jobbtitel",
            "nyckelord",
            "företagsnamn",
            "innan du fortsätter",
            "hämtad från",
            "fullständig jobbeskrivning",
            "jobbinformation",
            "anställningsform",
            "förmåner",
            "jobb som matchar",
            "karriärråd",
            "bläddra bland jobb",
            "länder",
            "om indeed",
            "hjälp",
            "tillgänglighet på indeed",
            "sekretesscenter",
            "rapportering enligt",
            "sida om onlinesäkerhet",
            "cookies",
            "villkor",
            "© 2026 indeed",
            "av 5 stjärnor"
        ]);
    }

    private static IReadOnlyList<string> ExtractLanguages(string text)
    {
        var languages = new List<string>();
        if (ContainsAny(text, ["svenska", "swedish"]))
        {
            languages.Add("Svenska");
        }

        if (ContainsAny(text, ["engelska", "english"]))
        {
            languages.Add("Engelska");
        }

        return languages;
    }

    private static string ExtractRole(IReadOnlyList<string> lines, IReadOnlyList<string> keywords, string roleHint)
    {
        if (!string.IsNullOrWhiteSpace(roleHint))
        {
            return roleHint;
        }

        var jobPostTitle = lines.FirstOrDefault(line =>
            line.Contains("job post", StringComparison.OrdinalIgnoreCase)
            && !ContainsAny(line, ["skapa ett", "indeed-konto"]));

        if (!string.IsNullOrWhiteSpace(jobPostTitle))
        {
            return CleanRoleLine(jobPostTitle);
        }

        var roleLine = lines.FirstOrDefault(line =>
            line.Length <= 140
            && LooksLikeRoleLine(line));

        if (!string.IsNullOrWhiteSpace(roleLine))
        {
            return CleanRoleLine(roleLine);
        }

        var roleKeywords = keywords.Where(keyword => ContainsAny(keyword, ["analyst", "analytics", "utvecklare", "developer", "arkitekt", "designer", "engineer", "manager", "ledare", "trainee", "analytiker"])).Take(3).ToArray();
        return roleKeywords.Length > 0 ? string.Join(" ", roleKeywords) : "Okänd roll";
    }

    private static bool LooksLikeRoleLine(string line)
    {
        return ContainsAny(line, [
            "junior data engineer", "data engineer", "data analyst", "analyst", "analytics consultant", "data scientist",
            "frontendutvecklare", "backendutvecklare", "fullstack", "developer", "utvecklare", "arkitekt",
            "projektledare", "designer", "engineer", "trainee", "analytiker"
        ]);
    }

    private static string CleanRoleLine(string roleLine)
    {
        var cleaned = roleLine
            .Replace("- job post", "", StringComparison.OrdinalIgnoreCase)
            .Replace("job post", "", StringComparison.OrdinalIgnoreCase)
            .Trim(' ', '-', '|');
        return cleaned.Length > 80 ? string.Concat(cleaned.AsSpan(0, 77), "...") : cleaned;
    }

    private static string ExtractIndustry(string text)
    {
        if (ContainsAny(text, ["bank", "finans", "insurance", "försäkring"])) return "Finans";
        if (ContainsAny(text, ["bygg", "construction"])) return "Bygg";
        if (ContainsAny(text, ["healthcare", "vård", "omsorg"])) return "Vård";
        if (ContainsAny(text, ["retail", "e-handel", "ecommerce"])) return "Retail/e-handel";
        if (ContainsAny(text, ["myndighet", "public sector", "kommun", "region"])) return "Offentlig sektor";
        return "Ej identifierad";
    }

    private static string ExtractSeniority(string text)
    {
        var firstLines = string.Join('\n', text
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(line => !IsPageNoiseLine(line))
            .Take(12));
        if (ContainsAny(firstLines, ["junior data engineer", "junior ", "0-2 years", "0–2 years", "0-2 års", "0–2 års"])) return "Junior";
        if (ContainsAny(text, ["minst fyra års", "minst 4 års", "4 års arbetslivserfarenhet", "fyra års arbetslivserfarenhet"])) return "Mid/senior";
        if (ContainsAny(firstLines, ["senior", "lead", "principal", "arkitekt"])) return "Senior";
        if (ContainsAny(text, ["trainee", "nyutexaminerade"])) return "Trainee/junior";
        if (ContainsAny(text, ["junior"])) return "Junior";
        return "Ej angivet";
    }

    private static string ExtractLocation(string text, string locationHint)
    {
        if (!string.IsNullOrWhiteSpace(locationHint))
        {
            return char.ToUpperInvariant(locationHint[0]) + locationHint[1..];
        }

        foreach (var location in new[] { "Stockholm", "Göteborg", "Malmö", "Uppsala", "Linköping", "Järfälla", "Remote", "Distans" })
        {
            if (text.Contains(location, StringComparison.OrdinalIgnoreCase))
            {
                return location;
            }
        }

        return "Ej angivet";
    }

    private static string ExtractAssignmentType(string text)
    {
        if (ContainsAny(text, ["tillsvidare", "anställning", "heltid"])) return "Anställning";
        if (ContainsAny(text, ["uppdrag", "konsult", "contract", "freelance"])) return "Konsultuppdrag";
        return "Ej angivet";
    }

    private static bool IsLikelyTechnology(string keyword)
    {
        var normalized = NormalizeTerm(keyword);
        var exactTechnologies = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "csharp", "dotnet", "react", "native", "typescript", "javascript", "azure", "aws", "sql", "postgresql",
            "docker", "kubernetes", "terraform", "devops", "github", "api", "microservices", "figma", "ux", "ui",
            "node", "python", "java", "ai", "ml", "bi", "gcp", "analytics", "analys", "datanalys", "datateknik",
            "data", "datamodellering", "datawarehouse", "dataintegration", "etl", "powerbi", "fabric", "snowflake",
            "kpi", "kpi:er", "dashboard", "dashboards", "tableau", "looker", "thoughtspot", "mixpanel", "amplitude",
            "googleanalytics", "excel", "googlesheets", "statistik", "regressionsmodellering", "machinelearning",
            "dbt", "airflow", "dagster", "bigquery", "redshift", "elt", "terraform", "cicd", "containers",
            "kafka", "metabase", "pipelines", "warehouse", "warehouses", "modeling", "transformation",
            "ingestion", "orchestration"
        };

        if (exactTechnologies.Contains(normalized))
        {
            return true;
        }

        return normalized.Contains("sqlserver", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains("reactnative", StringComparison.OrdinalIgnoreCase);
    }

    private static IReadOnlyList<string> BuildStrongSignals(
        CandidateProfile candidate,
        IReadOnlyList<string> matchingSkills,
        JobAdvertisementAnalysis analysis,
        int languageMatches)
    {
        var signals = new List<string>();
        signals.AddRange(matchingSkills.Take(5).Select(skill => $"Har verifierad kompetens inom {skill}."));

        if (candidate.Availability.Equals("Tillgänglig", StringComparison.OrdinalIgnoreCase))
        {
            signals.Add("Markerad som tillgänglig.");
        }

        if (candidate.ExperienceYears >= 5)
        {
            signals.Add($"{candidate.ExperienceYears} års erfarenhet.");
        }

        if (languageMatches > 0)
        {
            signals.Add($"Matchar språkkrav: {string.Join(", ", analysis.Languages)}.");
        }

        return signals.Count == 0 ? ["Inga starka verifierade signaler hittades."] : signals;
    }

    private static IReadOnlyList<string> BuildRisks(CandidateProfile candidate, IReadOnlyList<string> missing, JobAdvertisementAnalysis analysis)
    {
        var risks = new List<string>();
        if (!candidate.Availability.Equals("Tillgänglig", StringComparison.OrdinalIgnoreCase))
        {
            risks.Add($"Kandidaten är markerad som {candidate.Availability.ToLowerInvariant()}.");
        }

        if (candidate.ExperienceYears >= 4
            && (analysis.Seniority.Equals("Trainee/junior", StringComparison.OrdinalIgnoreCase)
                || analysis.Seniority.Equals("Junior", StringComparison.OrdinalIgnoreCase)))
        {
            risks.Add("Rollen är junior; kandidaten kan uppfattas som mer senior än annonsen efterfrågar.");
        }

        risks.AddRange(missing.Take(5).Select(keyword => $"Saknar explicit {keyword} i profilen."));

        foreach (var language in analysis.Languages)
        {
            if (!candidate.Languages.Any(candidateLanguage => IsMeaningfulTermMatch(candidateLanguage, language)))
            {
                risks.Add($"{language} finns inte tydligt angivet som språk.");
            }
        }

        return risks.Count == 0 ? ["Inga tydliga risker utifrån registrerad data."] : risks;
    }

    private static string SuggestCvVersion(JobAdvertisementAnalysis analysis, CandidateProfile candidate)
    {
        var candidateText = string.Join(" ", candidate.Title, candidate.Summary, string.Join(" ", candidate.Skills));
        var jobText = string.Join(" ", analysis.Role, string.Join(" ", analysis.Technologies), string.Join(" ", analysis.Keywords));

        if (ContainsAny(jobText, ["data", "analytics", "analys", "ai", "ml", "machine learning", "power bi", "fabric", "datamodellering", "trainee"])
            || ContainsAny(candidateText, ["analytiker", "data warehouse", "power bi", "azure fabric", "machine learning", "datamodellering"]))
        {
            return "Data/Analytics-CV";
        }
        if (ContainsAny(candidateText, ["dotnet", "csharp", "backend", "api", "sql"])) return "Backend/.NET-CV";
        if (ContainsAny(candidateText, ["react", "frontend", "ui", "ux"])) return "Frontend-CV";
        if (ContainsAny(jobText, ["dotnet", "csharp", "backend", "api", "sql"])) return "Backend/.NET-CV";
        if (ContainsAny(jobText, ["react", "frontend", "ui", "ux"])) return "Frontend-CV";
        if (ContainsAny(jobText, ["azure", "aws", "cloud", "devops", "terraform", "kubernetes"])) return "Cloud-CV";
        if (ContainsAny(jobText, ["projektledare", "project manager", "scrum", "agile"])) return "Projektledar-CV";
        return "Kort kundprofil";
    }

    private static IReadOnlyList<string> BuildRecommendedActions(
        CandidateProfile candidate,
        IReadOnlyList<string> missing,
        JobAdvertisementAnalysis analysis,
        string suggestedCvVersion)
    {
        var actions = new List<string>
        {
            $"Generera {suggestedCvVersion} och granska innan kundexport.",
            "Lyft fram verifierade projekt som matchar annonsens krav."
        };

        if (missing.Count > 0)
        {
            actions.Add("Kontrollera CV-gap med kandidaten innan något läggs till.");
        }

        if (!candidate.Availability.Equals("Tillgänglig", StringComparison.OrdinalIgnoreCase))
        {
            actions.Add("Stäm av beläggning eller välj alternativ kandidat.");
        }

        if (analysis.Languages.Count > 0)
        {
            actions.Add($"Skapa CV på språk som matchar kunden: {string.Join(", ", analysis.Languages)}.");
        }

        return actions;
    }

    private static IReadOnlyList<string> BuildCandidateTerms(CandidateProfile candidate)
    {
        return [
            candidate.Title,
            candidate.Summary,
            candidate.CurrentAssignment,
            ..candidate.Skills,
            ..candidate.Projects.Select(project => project.Role),
            ..candidate.Projects.Select(project => project.Description),
            ..candidate.Projects.SelectMany(project => project.Technologies)
        ];
    }

    private static bool MatchesAnyKeyword(string value, IReadOnlyList<string> keywords)
    {
        return keywords.Any(keyword => IsMeaningfulTermMatch(value, keyword));
    }

    private static bool IsMeaningfulTermMatch(string value, string keyword)
    {
        var normalizedValue = NormalizeTerm(value);
        var normalizedKeyword = NormalizeTerm(keyword);
        var shortAllowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "ai", "ml", "bi", "ux", "ui", "sql", "etl", "elt", "dbt", "aws", "gcp" };

        if (normalizedValue.Equals(normalizedKeyword, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (shortAllowed.Contains(normalizedKeyword)
            && (normalizedValue.Split(' ', StringSplitOptions.RemoveEmptyEntries).Contains(normalizedKeyword, StringComparer.OrdinalIgnoreCase)
                || normalizedValue.Contains(normalizedKeyword, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        if (shortAllowed.Contains(normalizedValue)
            && normalizedKeyword.Split(' ', StringSplitOptions.RemoveEmptyEntries).Contains(normalizedValue, StringComparer.OrdinalIgnoreCase))
        {
            return true;
        }

        if (normalizedValue.Length < 3 || normalizedKeyword.Length < 3)
        {
            return false;
        }

        return normalizedValue.Split(' ', StringSplitOptions.RemoveEmptyEntries).Contains(normalizedKeyword, StringComparer.OrdinalIgnoreCase)
            || normalizedKeyword.Split(' ', StringSplitOptions.RemoveEmptyEntries).Contains(normalizedValue, StringComparer.OrdinalIgnoreCase)
            || (normalizedKeyword.Length >= 4 && normalizedValue.Contains(normalizedKeyword, StringComparison.OrdinalIgnoreCase))
            || (normalizedValue.Length >= 4 && normalizedKeyword.Contains(normalizedValue, StringComparison.OrdinalIgnoreCase));
    }

    private static string NormalizeTerm(string value)
    {
        var normalized = value
            .Trim()
            .Trim('-', '"', '\'', '.', ',', ':', ';', '(', ')')
            .Replace("c#", "csharp", StringComparison.OrdinalIgnoreCase)
            .Replace(".net", "dotnet", StringComparison.OrdinalIgnoreCase)
            .Replace("machine learning", "ml", StringComparison.OrdinalIgnoreCase)
            .Replace("machinelearning", "ml", StringComparison.OrdinalIgnoreCase)
            .Replace("power bi", "bi", StringComparison.OrdinalIgnoreCase)
            .Replace("powerbi", "bi", StringComparison.OrdinalIgnoreCase)
            .Replace("data warehouse", "datawarehouse", StringComparison.OrdinalIgnoreCase)
            .Replace("data analyst", "dataanalyst", StringComparison.OrdinalIgnoreCase)
            .Replace("analyst", "analys", StringComparison.OrdinalIgnoreCase)
            .Replace("analytics", "analys", StringComparison.OrdinalIgnoreCase)
            .ToLowerInvariant();

        return normalized switch
        {
            "net" => "dotnet",
            "c" => "csharp",
            "googleanalys" => "googleanalytics",
            "warehouses" => "warehouse",
            "pipelines" => "pipeline",
            _ => normalized
        };
    }

    private static bool ContainsAny(string value, IReadOnlyList<string> terms)
    {
        return terms.Any(term => value.Contains(term, StringComparison.OrdinalIgnoreCase));
    }

    private static IReadOnlyList<string> ExtractKeywords(string text)
    {
        text = text
            .Replace("&nbsp;", " ", StringComparison.OrdinalIgnoreCase)
            .Replace("nbsp", " ", StringComparison.OrdinalIgnoreCase)
            .Replace("Google Analytics", "GoogleAnalytics", StringComparison.OrdinalIgnoreCase)
            .Replace("Google Sheets", "GoogleSheets", StringComparison.OrdinalIgnoreCase)
            .Replace("Machine Learning", "MachineLearning", StringComparison.OrdinalIgnoreCase)
            .Replace("Data Warehouse", "DataWarehouse", StringComparison.OrdinalIgnoreCase)
            .Replace("Power BI", "PowerBI", StringComparison.OrdinalIgnoreCase)
            .Replace("CI/CD", "CICD", StringComparison.OrdinalIgnoreCase);

        var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "och", "att", "med", "som", "för", "the", "and", "with", "you", "ska", "har", "ett", "det", "den", "till", "inom",
            "söker", "job", "jobb", "post", "tillsvidare", "heltid", "anställningsform", "jobbinformation", "skapa", "konto",
            "innan", "fortsätter", "företagets", "webbplats", "ab", "administrativ", "assistent", "years", "erfarenhet",
            "krav", "måste", "meriterande", "bör", "plats", "start", "roll", "kund", "client", "company", "sökes",
            "konsult", "projekt", "remote", "distans", "hybrid", "möjligt", "svenska", "engelska", "swedish", "english",
            "senior", "junior", "lead", "required", "must", "nice", "have", "hos", "oss", "får", "chef", "kontaktperson",
            "rekryterande", "job", "post", "com", "indeed", "stjärnor", "stjärna", "ort", "förmåner", "hämtad",
            "fullständig", "jobbeskrivningen", "jobbeskrivning", "lärlingsprogram", "nyutexaminerade", "fortsätter",
            "bolag", "företag", "detta", "dina", "våra", "vårt", "vår", "kommer", "där", "också", "genom", "parallellt",
            "två", "tre", "andra", "kontaktpersoner", "huvudinnehåll", "vad", "var", "länder", "cookies", "villkor",
            "karriärråd", "hjälp", "onlinesäkerhet", "sekretesscenter", "rapportering", "tillgänglighet",
            "jobbtitel", "nyckelord", "företagsnamn", "från", "fullständiga", "brinner", "använda", "göra",
            "skillnad", "hjälper", "organisationer", "samla", "strukturera", "agera", "uppdragsgivare",
            "nya", "nivåer", "samarbetar", "produkt", "techbolag", "arbetar", "minst", "fyra", "års",
            "about", "role", "what", "offer", "looking", "someone", "work", "alongside", "experienced",
            "engineers", "clients", "trust", "business", "small", "team", "values", "curiosity",
            "craftsmanship", "healthy", "life", "balance", "hands", "grow", "quickly", "write",
            "production", "code", "first", "weeks", "mentorship", "review", "teammates", "touch",
            "full", "lifecycle", "downstream", "users", "build", "maintain", "using", "develop",
            "against", "cloud", "author", "operate", "scheduled", "deploy", "monitor", "collaborate",
            "translate", "questions", "participate", "improvement", "professional", "experience",
            "strong", "internship", "degree", "computer", "science", "engineering", "mathematics",
            "statistics", "equivalent", "practical", "written", "spoken", "care", "quality",
            "personal", "projects", "familiarity", "modern", "ownership", "direct", "flat",
            "calm", "culture", "deep", "busywork", "apply", "send", "short", "note", "proud",
            "applications", "reviewed", "rolling", "basis", "early", "reach", "out", "turn",
            "raw", "reliable", "actionable", "insight", "modern", "layers", "re", "who", "has",
            "solid", "working", "knowledge", "exposure", "least", "one", "platform", "tool"
        };
        var shortAllowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "ai", "ml", "bi", "ux", "ui" };

        return text.Split([' ', ',', '.', ':', ';', '/', '\n', '\r', '\t', '(', ')', '[', ']', '-', '&', '—'], StringSplitOptions.RemoveEmptyEntries)
            .Select(word => NormalizeTerm(word.Trim().Trim('-', '"', '\'')))
            .Where(word => (word.Length > 2 || shortAllowed.Contains(word)) && !word.Contains('@') && !word.StartsWith('+') && !stopWords.Contains(word))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(80)
            .ToArray();
    }
}
