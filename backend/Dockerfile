FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/api ./cmd/api

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /bin/api /bin/api
COPY --from=builder /app/migrations /migrations
COPY --from=builder /app/policies /policies

WORKDIR /

EXPOSE 8080

ENTRYPOINT ["/bin/api"]
