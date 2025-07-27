package main

// import (
// 	"crypto/x509"
// 	"encoding/hex"
// 	"flag"
// 	"fmt"
// 	"os"

// 	// prv "github.com/JoltzRewards/lightning-terminal-private/litrpc"

// 	"github.com/lightningnetwork/lnd/lnrpc"

// 	"github.com/lightningnetwork/lnd/macaroons"
// 	"google.golang.org/grpc"
// 	"google.golang.org/grpc/credentials"
// 	"gopkg.in/macaroon.v2"
// )

// const TetherDir = "storeTetherLitd"

// var rpcServer string
// var litTlsCertPath string
// var litMacaroonPath string
// var lndtTlsCertPath string
// var lndMacaroonPath string
// var doUnleasing bool

// var network string

// func setFlags() {

// 	flag.StringVar(&rpcServer, "rpcserver", "localhost:8443", "rpc server of node")
// 	flag.StringVar(&litTlsCertPath, "lit-tlscertPath", "./.lit/tls.cert", "path to lit tls cert")
// 	flag.StringVar(&litMacaroonPath, "lit-macaroonPath", "./.lit/mainnet/lit.macaroon", "path to lit macaroon")
// 	flag.StringVar(&lndtTlsCertPath, "lnd-tlscertPath", "./.lit/tls.cert", "path to lnd tls cert")
// 	flag.StringVar(&lndMacaroonPath, "lnd-macaroonPath", "./.lnd/data/chain/bitcoin/mainnet/admin.macaroon", "path to lnd macaroon")
// 	flag.StringVar(&network, "network", "mainnet", "which lightning network")
// 	flag.BoolVar(&doUnleasing, "doUnleasing", false, "if true, will unlease anything that is leased. set it with --doUnleasing=true    it does happen to need the equal sign")

// 	flag.Parse()
// }

// func main() {
// 	setFlags()
// 	fmt.Printf("rpcserver: %s\n", rpcServer)
// 	fmt.Printf("litTlsCertPath: %s\n", litTlsCertPath)
// 	fmt.Printf("litMacaroonPath: %s\n", litMacaroonPath)
// 	fmt.Printf("lndtTlsCertPath: %s\n", lndtTlsCertPath)
// 	fmt.Printf("lndMacaroonPath: %s\n", lndMacaroonPath)
// 	fmt.Printf("network: %s\n", network)

// 	litConn, err := setupNodeConn(rpcServer, litMacaroonPath, litTlsCertPath, "", "")
// 	if err != nil {
// 		fmt.Println("error setting up lit connection: ", err)
// 		return
// 	}

// 	lndConn, err := setupNodeConn(rpcServer, lndMacaroonPath, lndtTlsCertPath, "", "")
// 	if err != nil {
// 		fmt.Println("error setting up lnd connection: ", err)
// 		return
// 	}

// 	ln := lnrpc.NewLightningClient(lndConn)

// }

// func SwapAssetToSats() error {
// 	return nil

// }

// func SwapSatsToAssets() error {
// 	return nil
// }

// func setupNodeConn(host string, macPath string, tlsCertPath string, macHex string, tlsHex string) (*grpc.ClientConn, error) {
// 	// Init client connection options.
// 	var opts []grpc.DialOption

// 	// Creds is to be populated directly from hex-encoded material
// 	// or via a path.
// 	var creds credentials.TransportCredentials

// 	// Use provided hex.
// 	if tlsHex != "" {
// 		cp := x509.NewCertPool()
// 		cert, err := hex.DecodeString(tlsHex)
// 		if err != nil {
// 			return nil, fmt.Errorf("failed to decode tls cert hex: %v", err)
// 		}

// 		cp.AppendCertsFromPEM(cert)
// 		creds = credentials.NewClientTLSFromCert(cp, "")

// 		// Else, read from filepath.
// 	} else if tlsCertPath != "" {
// 		credFile, err := credentials.NewClientTLSFromFile(tlsCertPath, "")
// 		if err != nil {
// 			return nil, fmt.Errorf("failed to read LND tls cert file: %v", err)
// 		}
// 		creds = credFile
// 	} else {
// 		return nil, fmt.Errorf("no tls cert provided")
// 	}

// 	// Append the tls cert as a dial option.
// 	opts = append(opts, grpc.WithTransportCredentials(creds))

// 	// Populated macaroon auth material.
// 	var rawMacaroon []byte
// 	if macHex != "" {
// 		// Use provided hex.
// 		macBytes, err := hex.DecodeString(macHex)
// 		if err != nil {
// 			return nil, fmt.Errorf("failed to decode macaroon hex: %v", err)
// 		}
// 		// Set the bytes as the macaroon cred.
// 		rawMacaroon = macBytes
// 	} else if macPath != "" {
// 		// Read in the macaroon.
// 		rawMac, err := os.ReadFile(macPath)
// 		if err != nil {
// 			return nil, fmt.Errorf("failed to read macaroon file: %v", err)
// 		}
// 		rawMacaroon = rawMac
// 	} else {
// 		// We have no path to obtaining the macaroon auth material.
// 		return nil, fmt.Errorf("no macaroon provided")
// 	}

// 	// Unmarshal the raw macaroon bytes.
// 	mac := &macaroon.Macaroon{}
// 	if err := mac.UnmarshalBinary(rawMacaroon); err != nil {
// 		return nil, fmt.Errorf("failed to unmarshal macaroon: %v", err)
// 	}
// 	macCred, err := macaroons.NewMacaroonCredential(mac)
// 	if err != nil {
// 		return nil, fmt.Errorf("failed to create macaroon credential: %v", err)
// 	}
// 	// Append the macaroon as a dial option .
// 	opts = append(opts, grpc.WithPerRPCCredentials(macCred))

// 	// Initialize the connection.
// 	conn, err := grpc.Dial(host, opts...)
// 	if err != nil {
// 		return nil, fmt.Errorf("failed to dial node at %v: %v", host, err)
// 	}

// 	return conn, nil
// }
