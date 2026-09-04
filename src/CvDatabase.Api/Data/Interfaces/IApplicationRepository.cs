using CvDatabase.Api.Data.DTOs;

namespace CvDatabase.Api.Data.Interfaces;

public interface IApplicationRepository
{
    Task<IReadOnlyList<ApplicationRecord>> ListAsync(CancellationToken cancellationToken = default);
    Task<ApplicationRecord> CreateAsync(ApplicationCreateRequest request, string createdBy, CancellationToken cancellationToken = default);
    Task<ApplicationRecord?> UpdateAsync(Guid id, ApplicationUpdateRequest request, CancellationToken cancellationToken = default);
    Task<ApplicationDuplicateCheckResponse> CheckDuplicateAsync(string advertisement, CancellationToken cancellationToken = default);
}
