using System.Text.RegularExpressions;
using CvDatabase.Api.Data.Entities;

namespace CvDatabase.Api.Data.Repositories;

internal static partial class ApplicationMatching
{
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "och", "att", "med", "som", "för", "till", "inom", "ska", "har", "the", "and", "with", "role", "job",
        "söker", "krav", "meriterande", "konsult", "uppdrag", "projekt", "heltid", "tillsvidare", "remote",
        "svenska", "engelska", "senior", "junior", "company", "client", "kund"
    };

    public static string Fingerprint(string text)
    {
        return string.Join(' ', Terms(text).Take(60));
    }

    public static int Similarity(string left, string right)
    {
        var leftTerms = Terms(left).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var rightTerms = Terms(right).ToHashSet(StringComparer.OrdinalIgnoreCase);
        if (leftTerms.Count == 0 || rightTerms.Count == 0)
        {
            return 0;
        }

        var overlap = leftTerms.Intersect(rightTerms, StringComparer.OrdinalIgnoreCase).Count();
        var union = leftTerms.Union(rightTerms, StringComparer.OrdinalIgnoreCase).Count();
        return (int)Math.Round((double)overlap / union * 100);
    }

    public static string Reason(ApplicationEntity application, int similarity)
    {
        return similarity >= 80
            ? "Mycket lik annons. Troligen redan hanterad."
            : $"Liknar tidigare ansökan hos {application.Customer}. Kontrollera innan ni skickar igen.";
    }

    private static IEnumerable<string> Terms(string text)
    {
        return WordRegex()
            .Matches(text.ToLowerInvariant().Replace(".net", "dotnet").Replace("c#", "csharp"))
            .Select(match => match.Value.Trim())
            .Where(word => word.Length > 2 && !StopWords.Contains(word))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(word => word, StringComparer.OrdinalIgnoreCase);
    }

    [GeneratedRegex("[a-zåäö0-9+#.]+", RegexOptions.IgnoreCase)]
    private static partial Regex WordRegex();
}
