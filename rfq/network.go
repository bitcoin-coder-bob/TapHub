package rfq

import (
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
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

type WebSocketConfig struct {
	WsConn   *websocket.Conn
	WsScheme string
	WsHost   string
	WsPath   string
}
type MarketDataConfig struct {
	WriteSendPriceMu     sync.Mutex
	PriceDataUrl         string
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

// RpcPriceOracleServer is a basic example RPC price oracle server.
type RpcPriceOracleServer struct {
	priceoraclerpc.UnimplementedPriceOracleServer
	cfg *MarketDataConfig
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
	serviceAddr := fmt.Sprintf("rfqrpc://%s", mdc.ServiceListenAddress)
	log.Printf("starting RPC price oracle service at address: %s", serviceAddr)

	server := RpcPriceOracleServer{
		cfg: mdc,
	}
	priceoraclerpc.RegisterPriceOracleServer(grpcServer, &server)

	grpcListener, err := net.Listen("tcp", mdc.ServiceListenAddress)
	if err != nil {
		return nil, fmt.Errorf("RPC server unable to listen on %s",
			mdc.ServiceListenAddress)
	}

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
			sleepTime := time.Second * 15
			err := GetBitPrecoPrice(mdc)
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
		log.Printf("error creating oracle service: %s\n", err.Error())
	}

	go mdc.Server.Serve(mdc.Listener)

	return nil
}
