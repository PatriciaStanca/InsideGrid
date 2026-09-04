using CvDatabase.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace CvDatabase.Api.Data.Context;

public sealed class CvDatabaseDbContext(DbContextOptions<CvDatabaseDbContext> options) : DbContext(options)
{
    public DbSet<CandidateEntity> Candidates => Set<CandidateEntity>();
    public DbSet<CandidateProjectEntity> CandidateProjects => Set<CandidateProjectEntity>();
    public DbSet<AppUserEntity> Users => Set<AppUserEntity>();
    public DbSet<ApplicationEntity> Applications => Set<ApplicationEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CandidateEntity>(entity =>
        {
            entity.ToTable("candidates");
            entity.HasKey(candidate => candidate.Id);
            entity.Property(candidate => candidate.Name).HasMaxLength(200).IsRequired();
            entity.Property(candidate => candidate.Title).HasMaxLength(200).IsRequired();
            entity.Property(candidate => candidate.Email).HasMaxLength(320);
            entity.Property(candidate => candidate.Phone).HasMaxLength(80);
            entity.Property(candidate => candidate.Location).HasMaxLength(160);
            entity.Property(candidate => candidate.Availability).HasMaxLength(80);
            entity.Property(candidate => candidate.CurrentAssignment).HasMaxLength(300);
            entity.Property(candidate => candidate.AvatarDataUrl).HasMaxLength(1_000_000);
            entity.Property(candidate => candidate.Skills).HasColumnType("text[]");
            entity.Property(candidate => candidate.Languages).HasColumnType("text[]");
            entity.HasMany(candidate => candidate.Projects)
                .WithOne(project => project.Candidate)
                .HasForeignKey(project => project.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CandidateProjectEntity>(entity =>
        {
            entity.ToTable("candidate_projects");
            entity.HasKey(project => project.Id);
            entity.Property(project => project.Customer).HasMaxLength(200).IsRequired();
            entity.Property(project => project.Role).HasMaxLength(200).IsRequired();
            entity.Property(project => project.Technologies).HasColumnType("text[]");
        });

        modelBuilder.Entity<AppUserEntity>(entity =>
        {
            entity.ToTable("app_users");
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Email).HasMaxLength(320).IsRequired();
            entity.Property(user => user.NormalizedEmail).HasMaxLength(320).IsRequired();
            entity.Property(user => user.DisplayName).HasMaxLength(200).IsRequired();
            entity.Property(user => user.PasswordHash).HasMaxLength(512).IsRequired();
            entity.Property(user => user.Role).HasMaxLength(80).IsRequired();
            entity.HasIndex(user => user.NormalizedEmail).IsUnique();
        });

        modelBuilder.Entity<ApplicationEntity>(entity =>
        {
            entity.ToTable("applications");
            entity.HasKey(application => application.Id);
            entity.Property(application => application.Customer).HasMaxLength(200).IsRequired();
            entity.Property(application => application.Role).HasMaxLength(200).IsRequired();
            entity.Property(application => application.CandidateIds).HasMaxLength(2000);
            entity.Property(application => application.CandidateNames).HasMaxLength(2000);
            entity.Property(application => application.Status).HasMaxLength(80).IsRequired();
            entity.Property(application => application.Feedback).HasMaxLength(2000);
            entity.Property(application => application.SourceUrl).HasMaxLength(1000);
            entity.Property(application => application.CreatedBy).HasMaxLength(320);
            entity.Property(application => application.NormalizedFingerprint).HasMaxLength(4000);
            entity.HasIndex(application => application.UpdatedAt);
        });
    }
}
