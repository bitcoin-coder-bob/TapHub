FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN GOOS=linux GOARCH=amd64 go build -o rfq .

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/rfq .

EXPOSE 8095

CMD ["./rfq"]
