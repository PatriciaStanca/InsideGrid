using CvDatabase.Api.Data.DTOs;

namespace CvDatabase.Api.Data.Interfaces;

public interface ICandidateRepository
{
    Task<IReadOnlyList<CandidateProfile>> SearchAsync(string? query, string? status, string? availability, CancellationToken cancellationToken = default);
    Task<CandidateProfile?> FindAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CandidateProfile> CreateAsync(CandidateUpsertRequest request, CancellationToken cancellationToken = default);
    Task<CandidateProfile?> UpdateAsync(Guid id, CandidateUpsertRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
