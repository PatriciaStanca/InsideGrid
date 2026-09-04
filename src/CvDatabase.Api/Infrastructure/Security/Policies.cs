namespace CvDatabase.Api.Infrastructure.Security;

public static class Policies
{
    public const string EmployeeRead = "employee:read";
    public const string ManagerWrite = "manager:write";
    public const string AdminOnly = "admin:all";
}
