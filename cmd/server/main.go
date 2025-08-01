package main

import (
	"TapHub/api"
	"TapHub/rfq"
	"context"
	"crypto/x509"
	"encoding/hex"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/lightningnetwork/lnd/lnrpc"

	"github.com/lightninglabs/taproot-assets/taprpc"
	"github.com/lightninglabs/taproot-assets/taprpc/universerpc"

	"github.com/lightningnetwork/lnd/macaroons"
	"github.com/linden/httplog"
	"github.com/rs/cors"
	"google.golang.org/grpc"

	"google.golang.org/grpc/credentials"
	"gopkg.in/macaroon.v2"
)

const TetherDir = "storeTetherLitd"

var Port string
var OracleRpcUri string
var rpcServerLnd string
var rpcServerTap string

var tapTlsCertPath string
var tapMacaroonPath string
var lndtTlsCertPath string
var lndMacaroonPath string
var network string
var apiNinjaKey string
var enableRfq bool

// go run main.go  -port=8085 -rpcserverLnd=127.0.0.1:10001 -rpcserverTap=127.0.0.1:12029 -tap-tlscertPath=/home/bob/.polar/networks/3/volumes/tapd/alice-tap/tls.cert -tap-macaroonPath=/home/bob/.polar/networks/3/volumes/tapd/alice-tap/data/regtest/admin.macaroon -lnd-tlscertPath=/home/bob/.polar/networks/3/volumes/lnd/alice/tls.cert -lnd-macaroonPath=/home/bob/.polar/networks/3/volumes/lnd/alice/data/chain/bitcoin/regtest/admin.macaroon -network=regtest -apiNinjaKey

func setFlags() {
	flag.StringVar(&Port, "port", "8085", "")
	flag.StringVar(&OracleRpcUri, "oracle_rpc_uri", "", "")
	flag.StringVar(&rpcServerLnd, "rpcserverLnd", "127.0.0.1:10009", "rpc server of node")
	flag.StringVar(&rpcServerTap, "rpcserverTap", "127.0.0.1:10009", "rpc server of node")

	flag.StringVar(&tapTlsCertPath, "tap-tlscertPath", "/home/bob/.lit/tls.cert", "path to tap tls cert")
	flag.StringVar(&tapMacaroonPath, "tap-macaroonPath", "/home/bob/.tapd/data/testnet4/admin.macaroon", "path to lit macaroon")
	flag.StringVar(&lndtTlsCertPath, "lnd-tlscertPath", "/home/bob/.lnd/tls.cert", "path to lnd tls cert")
	flag.StringVar(&lndMacaroonPath, "lnd-macaroonPath", "/home/bob/.lnd/data/chain/bitcoin/testnet4/admin.macaroon", "path to lnd macaroon")
	flag.StringVar(&network, "network", "testnet4", "which lightning network")
	flag.StringVar(&apiNinjaKey, "apiNinjaKey", "", "api key for api-ninjas.com")
	flag.BoolVar(&enableRfq, "enableRfq", false, "enables RFQ oracle to run")

	flag.Parse()
}

func main() {
	fmt.Printf("starting\n")
	setFlags()
	fmt.Printf("rpcserverLnd: %s\n", rpcServerLnd)
	fmt.Printf("rpcServerTap: %s\n", rpcServerTap)
	fmt.Printf("tapTlsCertPath: %s\n", tapTlsCertPath)
	fmt.Printf("tapMacaroonPath: %s\n", tapMacaroonPath)
	fmt.Printf("lndtTlsCertPath: %s\n", lndtTlsCertPath)
	fmt.Printf("lndMacaroonPath: %s\n", lndMacaroonPath)
	fmt.Printf("network: %s\n", network)
	var oracle *rfq.MarketDataConfig
	var err error
	if enableRfq {
		oracle, err = rfq.NewOracle()
		if err != nil {
			panic(err)
		}
	} else {
		oracle = &rfq.MarketDataConfig{}
		oracle.ProxyListenAddress = ""
		oracle.ServiceListenAddress = ""
		fmt.Printf("\n\nRFQ disabled\n\n")
	}
	tapConn, err := setupNodeConn(rpcServerTap, tapMacaroonPath, tapTlsCertPath, "", "")
	if err != nil {
		fmt.Println("error setting up tap connection: ", err)
		return
	}
	lndConn, err := setupNodeConn(rpcServerLnd, lndMacaroonPath, lndtTlsCertPath, "", "")
	if err != nil {
		fmt.Println("error setting up lnd connection: ", err)
		return
	}

	ln := lnrpc.NewLightningClient(lndConn)
	_, err = ln.GetInfo(context.Background(), &lnrpc.GetInfoRequest{})
	if err != nil {
		fmt.Println("error getting lnd info: ", err)
		return
	}
	tc := taprpc.NewTaprootAssetsClient(tapConn)
	_, err = tc.GetInfo(context.Background(), &taprpc.GetInfoRequest{})
	if err != nil {
		fmt.Println("error getting tap info: ", err)
		return
	}

	uc := universerpc.NewUniverseClient(tapConn)

	apiHandler, err := api.New(ln, tc, uc, oracle.ProxyListenAddress, oracle.ServiceListenAddress, enableRfq)
	if err != nil {
		fmt.Println("error setting up api: ", err)
		return
	}

	// Create the CORs middleware, allowing everything.
	m := cors.New(cors.Options{
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		AllowedMethods: []string{
			http.MethodHead,
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
		},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: false,
	})

	port := fmt.Sprintf(":%s", Port)

	// Create a structured logger, with the prefix "httplog".
	sl := slog.Default().WithGroup("httplog")

	// Create our http logger.
	hl := httplog.NewLogger(sl)

	// Serve on port ":8080", using the logging middleware.
	err = http.ListenAndServe(port, hl.Handler(m.Handler(apiHandler)))
	if err != nil {
		panic(err)
	}

	// channelGraph, err := ln.DescribeGraph(context.Background(), &lnrpc.ChannelGraphRequest{IncludeUnannounced: true})

}

func setupNodeConn(host string, macPath string, tlsCertPath string, macHex string, tlsHex string) (*grpc.ClientConn, error) {
	// Init client connection options.
	var opts []grpc.DialOption

	// Creds is to be populated directly from hex-encoded material
	// or via a path.
	var creds credentials.TransportCredentials

	// Use provided hex.
	if tlsHex != "" {
		cp := x509.NewCertPool()
		cert, err := hex.DecodeString(tlsHex)
		if err != nil {
			return nil, fmt.Errorf("failed to decode tls cert hex: %v", err)
		}

		cp.AppendCertsFromPEM(cert)
		creds = credentials.NewClientTLSFromCert(cp, "")

		// Else, read from filepath.
	} else if tlsCertPath != "" {
		credFile, err := credentials.NewClientTLSFromFile(tlsCertPath, "")
		if err != nil {
			return nil, fmt.Errorf("failed to read LND tls cert file: %v", err)
		}
		creds = credFile
	} else {
		return nil, fmt.Errorf("no tls cert provided")
	}

	// Append the tls cert as a dial option.
	opts = append(opts, grpc.WithTransportCredentials(creds))

	// Populated macaroon auth material.
	var rawMacaroon []byte
	if macHex != "" {
		// Use provided hex.
		macBytes, err := hex.DecodeString(macHex)
		if err != nil {
			return nil, fmt.Errorf("failed to decode macaroon hex: %v", err)
		}
		// Set the bytes as the macaroon cred.
		rawMacaroon = macBytes
	} else if macPath != "" {
		// Read in the macaroon.
		rawMac, err := os.ReadFile(macPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read macaroon file: %v", err)
		}
		rawMacaroon = rawMac
	} else {
		// We have no path to obtaining the macaroon auth material.
		return nil, fmt.Errorf("no macaroon provided")
	}

	// Unmarshal the raw macaroon bytes.
	mac := &macaroon.Macaroon{}
	if err := mac.UnmarshalBinary(rawMacaroon); err != nil {
		return nil, fmt.Errorf("failed to unmarshal macaroon: %v", err)
	}
	macCred, err := macaroons.NewMacaroonCredential(mac)
	if err != nil {
		return nil, fmt.Errorf("failed to create macaroon credential: %v", err)
	}
	// Append the macaroon as a dial option .
	opts = append(opts, grpc.WithPerRPCCredentials(macCred))

	// Initialize the connection.
	conn, err := grpc.Dial(host, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to dial node at %v: %v", host, err)
	}

	return conn, nil
}
