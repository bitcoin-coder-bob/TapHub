package rfq

import (
	"google.golang.org/grpc"
)

// Oracle defines the interface for price oracle implementations.
type Oracle interface {
	// Start initializes and starts the oracle service.
	Start() error

	// Stop gracefully shuts down the oracle service.
	Stop()

	// GetServiceAddress returns the address the oracle is listening on.
	GetServiceAddress() string

	// GetServer returns the gRPC server instance.
	GetServer() *grpc.Server

	// GetLatestBidPrice returns the current bid price.
	GetLatestBidPrice() float64

	// GetLatestAskPrice returns the current ask price.
	GetLatestAskPrice() float64

	// GetLatestIndexPrice returns the current index price.
	GetLatestIndexPrice() float64

	// UpdatePrices fetches and updates the latest prices.
	UpdatePrices() error
}
