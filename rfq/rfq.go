package rfq

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/improbable-eng/grpc-web/go/grpcweb"

	"github.com/lightninglabs/taproot-assets/taprpc/priceoraclerpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

type StringSlice []string

func (s *StringSlice) Set(value string) error {
	*s = append(*s, value)
	return nil
}
func (s *StringSlice) String() string {
	return strings.Join(*s, ",")
}

type MarketDataConfig struct {
	WriteSendPriceMu     sync.Mutex
	PriceDataUrl         string
	ApiKey               string
	ServiceListenAddress string
	ProxyListenAddress   string
	TlsCertPath          string
	TlsKeyPath           string
	Ticker               string
	AssetId              string
	BtcAssetId           string
	LatestBidPrice       float64
	LatestAskPrice       float64
	LatestIndexPrice     float64
	WriteReceivePriceMu  sync.Mutex
	MaxAssetTradeAmount  int
	DecimalDisplay       int
	ExchangeSpreadBips   float64
	JoltzFeeBips         int
	DesiredAssetIds      StringSlice
	Server               *grpc.Server
	Listener             net.Listener
}

func NewOracle() (*MarketDataConfig, error) {
	apiNinjaKey := os.Getenv("API_NINJA_KEY")
	if apiNinjaKey == "" {
		return nil, fmt.Errorf("API_NINJA_KEY environment variable is not set")
	}
	orc := &MarketDataConfig{
		PriceDataUrl:         "https://api.api-ninjas.com/v1/bitcoin",
		ApiKey:               apiNinjaKey, // https://api-ninjas.com/ api key
		ServiceListenAddress: "0.0.0.0:8096",
		DesiredAssetIds:      StringSlice{}, // need to pass an asset id that the rfq will recognize
		Ticker:               "USDT",
		BtcAssetId:           "0000000000000000000000000000000000000000000000000000000000000000",
		DecimalDisplay:       2,
		MaxAssetTradeAmount:  10_000_000, // $100,000 USDT
		ExchangeSpreadBips:   0,
		JoltzFeeBips:         0,
	}

	err := orc.Start()
	if err != nil {
		return nil, err
	}

	return orc, nil
}

// RpcPriceOracleServer is a basic example RPC price oracle server.
type RpcPriceOracleServer struct {
	priceoraclerpc.UnimplementedPriceOracleServer
	cfg *MarketDataConfig
}

var oneDay = 24 * time.Hour
var certificateType = "CERTIFICATE"
var ecPrivateKeyType = "EC PRIVATE KEY"

func generateSelfSignedCert() (*tls.Certificate, error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}

	keyUsage := x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature
	extKeyUsage := []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}
	template := x509.Certificate{
		SerialNumber: big.NewInt(0),
		Subject: pkix.Name{
			Organization: []string{"basic-price-oracle"},
		},
		NotBefore: time.Now(),
		NotAfter:  time.Now().Add(oneDay), // Valid for 1 day

		KeyUsage:              keyUsage,
		ExtKeyUsage:           extKeyUsage,
		BasicConstraintsValid: true,
	}

	certDER, err := x509.CreateCertificate(
		rand.Reader, &template, &template, &privateKey.PublicKey,
		privateKey,
	)
	if err != nil {
		return nil, err
	}

	privateKeyBits, err := x509.MarshalECPrivateKey(privateKey)
	if err != nil {
		return nil, err
	}

	certPEM := pem.EncodeToMemory(
		&pem.Block{Type: certificateType, Bytes: certDER},
	)
	keyPEM := pem.EncodeToMemory(
		&pem.Block{Type: ecPrivateKeyType, Bytes: privateKeyBits},
	)

	tlsCert, err := tls.X509KeyPair(certPEM, keyPEM)
	if err != nil {
		return nil, err
	}

	return &tlsCert, nil
}

func (mdc *MarketDataConfig) createOracleService() error {
	tlsCert := &tls.Certificate{}
	var err error
	if mdc.TlsCertPath == "" || mdc.TlsKeyPath == "" {
		tlsCert, err = generateSelfSignedCert()
		log.Println("generating self signed tls cert...")
		if err != nil {
			return fmt.Errorf("failed to generate TLS certificate: %w", err)
		}
	}

	if mdc.TlsCertPath != "" && mdc.TlsKeyPath != "" {
		log.Printf("using tls cert: %s tls key: %s\n", mdc.TlsCertPath, mdc.TlsKeyPath)
		tlsCertNotPointer, err := tls.LoadX509KeyPair(mdc.TlsCertPath, mdc.TlsKeyPath)
		if err != nil {
			return fmt.Errorf("failed to load TLS certificate: %w from cert path: %s key path: %s", err, mdc.TlsCertPath, mdc.TlsKeyPath)
		} else {
			tlsCert = &tlsCertNotPointer
		}
	}
	transportCreds := credentials.NewTLS(&tls.Config{
		Certificates: []tls.Certificate{*tlsCert},
	})
	server := grpc.NewServer(grpc.Creds(transportCreds))
	mdc.Server = server
	grpcListener, err := mdc.startRPCService(server)
	if err != nil {
		return fmt.Errorf("error with startRPCService: %w", err)
	}
	mdc.Listener = grpcListener
	err = mdc.startProxy(server)
	if err != nil {
		return fmt.Errorf("error with proxy server starting: %w", err)
	}
	return err
}

// startRPCService starts the given RPC server and blocks until the server is
// shut down.
func (mdc *MarketDataConfig) startRPCService(grpcServer *grpc.Server) (net.Listener, error) {
	// serviceAddr := fmt.Sprintf("rfqrpc://%s", mdc.ServiceListenAddress)
	// log.Printf("starting RPC price oracle service at address: %s", serviceAddr)

	server := RpcPriceOracleServer{
		cfg: mdc,
	}
	priceoraclerpc.RegisterPriceOracleServer(grpcServer, &server)
	fmt.Printf("using service listen addr: %s\n", mdc.ServiceListenAddress)
	grpcListener, err := net.Listen("tcp", mdc.ServiceListenAddress)
	if err != nil {
		return nil, fmt.Errorf("RPC server unable to listen on %s",
			mdc.ServiceListenAddress)
	}

	mdc.ServiceListenAddress = grpcListener.Addr().String()

	return grpcListener, err
}

func (mdc *MarketDataConfig) startProxy(grpcServer *grpc.Server) error {
	proxy := grpcweb.WrapServer(grpcServer,
		grpcweb.WithWebsockets(true),
		grpcweb.WithWebsocketPingInterval(2*time.Minute),
		grpcweb.WithCorsForRegisteredEndpointsOnly(false),
	)

	srv := &http.Server{
		WriteTimeout:      0,
		IdleTimeout:       0,
		ReadTimeout:       0,
		ReadHeaderTimeout: 1 * time.Second,
		Handler:           proxy,
	}

	lis, err := net.Listen("tcp", mdc.ProxyListenAddress)
	if err != nil {
		return err
	}

	tlsCert, err := generateSelfSignedCert()
	if err != nil {
		return fmt.Errorf("failed to generate TLS certificate: %w", err)
	}

	tlslis := tls.NewListener(lis, &tls.Config{
		Certificates: []tls.Certificate{*tlsCert},
	})

	mdc.ProxyListenAddress = tlslis.Addr().String()

	go srv.Serve(tlslis)

	return nil

}

func (mdc *MarketDataConfig) Start() error {
	go func() {
		for {
			sleepTime := time.Second * 300 // refresh price every 5 minutes
			err := GetAPINinjaPrice(mdc)
			if err != nil {
				log.Printf("error with index price stream: %s ... retrying in 5 seconds or exiting if interrupt detected\n", err.Error())
				sleepTime = time.Second * 5
			}
			time.Sleep(sleepTime)
		}
	}()

	// start oracle service
	err := mdc.createOracleService()
	if err != nil {
		return fmt.Errorf("error creating oracle service: %w", err)
	}

	go mdc.Server.Serve(mdc.Listener)

	return nil
}

// Stop gracefully shuts down the oracle service.
func (mdc *MarketDataConfig) Stop() {
	if mdc.Server != nil {
		mdc.Server.Stop()
	}
}

// GetServiceAddress returns the address the oracle is listening on.
func (mdc *MarketDataConfig) GetServiceAddress() string {
	return mdc.ServiceListenAddress
}

// GetServer returns the gRPC server instance.
func (mdc *MarketDataConfig) GetServer() *grpc.Server {
	return mdc.Server
}

// GetLatestBidPrice returns the current bid price.
func (mdc *MarketDataConfig) GetLatestBidPrice() float64 {
	mdc.WriteReceivePriceMu.Lock()
	defer mdc.WriteReceivePriceMu.Unlock()
	return mdc.LatestBidPrice
}

// GetLatestAskPrice returns the current ask price.
func (mdc *MarketDataConfig) GetLatestAskPrice() float64 {
	mdc.WriteReceivePriceMu.Lock()
	defer mdc.WriteReceivePriceMu.Unlock()
	return mdc.LatestAskPrice
}

// GetLatestIndexPrice returns the current index price.
func (mdc *MarketDataConfig) GetLatestIndexPrice() float64 {
	mdc.WriteReceivePriceMu.Lock()
	defer mdc.WriteReceivePriceMu.Unlock()
	return mdc.LatestIndexPrice
}

// UpdatePrices fetches and updates the latest prices.
func (mdc *MarketDataConfig) UpdatePrices() error {
	return GetAPINinjaPrice(mdc)
}

// APINinja Response structure from https://api.api-ninjas.com/v1/bitcoin
type APINinjaResponse struct {
	Price                 string `json:"price"`
	Timestamp             int64  `json:"timestamp"`
	PriceChange24h        string `json:"24h_price_change"`
	PriceChangePercent24h string `json:"24h_price_change_percent"`
	High24h               string `json:"24h_high"`
	Low24h                string `json:"24h_low"`
	Volume24h             string `json:"24h_volume"`
}

func GetAPINinjaPrice(mdc *MarketDataConfig) error {
	client := &http.Client{}
	req, err := http.NewRequest("GET", mdc.PriceDataUrl, nil)
	if err != nil {
		log.Fatalf("Failed to create request to price API: %v", err)
	}
	// Add the X-Api-Key header
	req.Header.Set("X-Api-Key", mdc.ApiKey)

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Failed to send request to price API: %v", err)
	}
	defer resp.Body.Close()

	var data APINinjaResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return fmt.Errorf("failed to decode bitpreco response: %w", err)
	}

	price, err := strconv.ParseFloat(data.Price, 64)
	if err != nil {
		log.Fatalf("Failed to parse float of btc price data: %v", err)
	}
	indexPrice := price
	mdc.WriteReceivePriceMu.Lock()
	mdc.LatestIndexPrice = indexPrice
	// 100 bips = 1%, 1,000 bips = 10%, 10,000 bips = 100%
	mdc.LatestAskPrice = indexPrice * float64(1+mdc.ExchangeSpreadBips/10000)
	mdc.LatestBidPrice = indexPrice * float64(1-mdc.ExchangeSpreadBips/10000)
	log.Printf("--- new exchange ASK price: %f\n", mdc.LatestAskPrice)
	log.Printf("--- new exchange BID price: %f\n", mdc.LatestBidPrice)
	log.Printf("--- new INDEX price: %f\n", mdc.LatestIndexPrice)
	mdc.WriteReceivePriceMu.Unlock()

	return nil
}
