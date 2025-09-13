FROM golang:1.25 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /out/app ./cmd/*

FROM alpine:3.20 AS runner
RUN adduser -D -u 65532 appuser
WORKDIR /app
COPY --from=build /out/app /app/app
USER appuser
EXPOSE 8080
ENTRYPOINT ["/app/app"]
WORKDIR /app
COPY --from=build /out/app /app/app
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/app/app"]
