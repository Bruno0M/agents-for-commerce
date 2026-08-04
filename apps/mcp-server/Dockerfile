FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG TARGETARCH
WORKDIR /src

COPY McpServer.csproj ./
RUN dotnet restore McpServer.csproj -a "$TARGETARCH"

COPY . .
RUN dotnet publish McpServer.csproj -c Release -a "$TARGETARCH" --no-restore -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

COPY --from=busybox:uclibc /bin/busybox /bin/busybox

WORKDIR /app
COPY --from=build /app/publish ./

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

USER $APP_UID

ENTRYPOINT ["dotnet", "McpServer.dll"]
