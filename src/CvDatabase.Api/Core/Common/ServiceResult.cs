namespace CvDatabase.Api.Core.Common;

public class ServiceResult
{
    public int StatusCode { get; init; }
    public string? Error { get; init; }

    public static ServiceResult Ok() => new() { StatusCode = StatusCodes.Status200OK };
    public static ServiceResult NoContent() => new() { StatusCode = StatusCodes.Status204NoContent };
    public static ServiceResult Created() => new() { StatusCode = StatusCodes.Status201Created };
    public static ServiceResult Fail(int statusCode, string error) => new() { StatusCode = statusCode, Error = error };
}

public class ServiceResult<T>
{
    public int StatusCode { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }

    public static ServiceResult<T> Ok(T data) => new() { StatusCode = StatusCodes.Status200OK, Data = data };
    public static ServiceResult<T> Created(T data) => new() { StatusCode = StatusCodes.Status201Created, Data = data };
    public static ServiceResult<T> NoContent() => new() { StatusCode = StatusCodes.Status204NoContent };
    public static ServiceResult<T> Fail(int statusCode, string error) => new() { StatusCode = statusCode, Error = error };
}
