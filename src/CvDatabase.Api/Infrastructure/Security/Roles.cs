namespace CvDatabase.Api.Infrastructure.Security;

public static class Roles
{
    public const string Employee = "Employee";
    public const string Manager = "Manager";
    public const string Admin = "Admin";

    public static readonly string[] All = [Employee, Manager, Admin];
}
