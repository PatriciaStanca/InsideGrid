using System.Text;
using CvDatabase.Api.Data.DTOs;

namespace CvDatabase.Api.Core.Services;

public sealed class PdfExportService
{
    public byte[] GenerateCandidateCv(CandidateProfile candidate, string language)
    {
        var lines = new List<string>
        {
            candidate.Name,
            candidate.Title,
            $"{candidate.Location} | {candidate.Email} | {candidate.Phone}",
            "",
            language.Equals("en", StringComparison.OrdinalIgnoreCase) ? "Profile" : "Profil",
            candidate.Summary,
            "",
            language.Equals("en", StringComparison.OrdinalIgnoreCase) ? "Skills" : "Kompetenser",
            string.Join(", ", candidate.Skills),
            "",
            language.Equals("en", StringComparison.OrdinalIgnoreCase) ? "Projects" : "Projekt"
        };

        lines.AddRange(candidate.Projects.Select(project => $"{project.Customer} - {project.Role}: {project.Description}"));
        return CreateSimplePdf(lines);
    }

    public byte[] GenerateMarkdownCv(string markdown)
    {
        var lines = markdown
            .Replace("**", "", StringComparison.Ordinal)
            .Split('\n', StringSplitOptions.TrimEntries)
            .Select(line => line.TrimStart('#', '-', ' '))
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .SelectMany(WrapLine)
            .ToArray();

        return CreateSimplePdf(lines);
    }

    private static IEnumerable<string> WrapLine(string line)
    {
        const int maxLength = 82;
        if (line.Length <= maxLength)
        {
            yield return line;
            yield break;
        }

        for (var index = 0; index < line.Length; index += maxLength)
        {
            yield return line[index..Math.Min(index + maxLength, line.Length)];
        }
    }

    private static byte[] CreateSimplePdf(IReadOnlyList<string> lines)
    {
        var content = new StringBuilder();
        content.AppendLine("BT");
        content.AppendLine("/F1 11 Tf");
        content.AppendLine("50 780 Td");

        foreach (var line in lines.Take(42))
        {
            content.AppendLine($"({Escape(line)}) Tj");
            content.AppendLine("0 -18 Td");
        }

        content.AppendLine("ET");

        var stream = Encoding.ASCII.GetBytes(content.ToString());
        var objects = new List<string>
        {
            "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
            "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
            "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
            "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
            $"5 0 obj << /Length {stream.Length} >> stream\n{content}endstream endobj\n"
        };

        var pdf = new StringBuilder("%PDF-1.4\n");
        var offsets = new List<int> { 0 };
        foreach (var obj in objects)
        {
            offsets.Add(Encoding.ASCII.GetByteCount(pdf.ToString()));
            pdf.Append(obj);
        }

        var xrefStart = Encoding.ASCII.GetByteCount(pdf.ToString());
        pdf.AppendLine("xref");
        pdf.AppendLine($"0 {objects.Count + 1}");
        pdf.AppendLine("0000000000 65535 f ");
        foreach (var offset in offsets.Skip(1))
        {
            pdf.AppendLine($"{offset:0000000000} 00000 n ");
        }

        pdf.AppendLine("trailer");
        pdf.AppendLine($"<< /Size {objects.Count + 1} /Root 1 0 R >>");
        pdf.AppendLine("startxref");
        pdf.AppendLine(xrefStart.ToString());
        pdf.AppendLine("%%EOF");

        return Encoding.ASCII.GetBytes(pdf.ToString());
    }

    private static string Escape(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("(", "\\(", StringComparison.Ordinal)
            .Replace(")", "\\)", StringComparison.Ordinal)
            .Replace("å", "a", StringComparison.OrdinalIgnoreCase)
            .Replace("ä", "a", StringComparison.OrdinalIgnoreCase)
            .Replace("ö", "o", StringComparison.OrdinalIgnoreCase);
    }
}
