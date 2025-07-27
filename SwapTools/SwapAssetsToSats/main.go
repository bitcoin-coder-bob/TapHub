package main

import (
	"context"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"os"

	"github.com/lightninglabs/taproot-assets/asset"
	"github.com/lightninglabs/taproot-assets/fn"
	"github.com/lightningnetwork/lnd/lnrpc/routerrpc"
	"github.com/lightningnetwork/lnd/lnwire"

	"github.com/lightninglabs/taproot-assets/rfqmath"
	"github.com/lightninglabs/taproot-assets/rfqmsg"

	// prv "github.com/JoltzRewards/lightning-terminal-private/litrpc"

	"github.com/lightninglabs/taproot-assets/rfq"
	"github.com/lightninglabs/taproot-assets/taprpc"

	"github.com/lightninglabs/taproot-assets/taprpc/tapchannelrpc"
	"github.com/lightningnetwork/lnd/lnrpc"

	"github.com/lightningnetwork/lnd/macaroons"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"gopkg.in/macaroon.v2"
)

var rpcServerLnd string
var rpcServerTap string

var tapTlsCertPath string
var tapMacaroonPath string
var lndtTlsCertPath string
var lndMacaroonPath string
var assetId string
var peerPk string
var rfqAddr string

var satsToGet int64
var network string

type CustomChannelData struct {
	FundingAssets       []FundingAsset `json:"funding_assets"`
	LocalAssets         []LocalAsset   `json:"local_assets"`
	RemoteAssets        []interface{}  `json:"remote_assets"`
	OutgoingHTLCs       []interface{}  `json:"outgoing_htlcs"`
	IncomingHTLCs       []interface{}  `json:"incoming_htlcs"`
	Capacity            int64          `json:"capacity"`
	GroupKey            string         `json:"group_key"`
	LocalBalance        int64          `json:"local_balance"`
	RemoteBalance       int64          `json:"remote_balance"`
	OutgoingHTLCBalance int64          `json:"outgoing_htlc_balance"`
	IncomingHTLCBalance int64          `json:"incoming_htlc_balance"`
}

type FundingAsset struct {
	Version        int          `json:"version"`
	AssetGenesis   AssetGenesis `json:"asset_genesis"`
	Amount         int64        `json:"amount"`
	ScriptKey      string       `json:"script_key"`
	DecimalDisplay int          `json:"decimal_display"`
}

type AssetGenesis struct {
	GenesisPoint string `json:"genesis_point"`
	Name         string `json:"name"`
	MetaHash     string `json:"meta_hash"`
	AssetID      string `json:"asset_id"`
}

type LocalAsset struct {
	AssetID string `json:"asset_id"`
	Amount  int64  `json:"amount"`
}

func setFlags() {
	flag.StringVar(&rpcServerLnd, "rpcserverLnd", "127.0.0.1:10009", "rpc server of node")
	flag.StringVar(&rpcServerTap, "rpcserverTap", "127.0.0.1:10009", "rpc server of node")
	flag.StringVar(&assetId, "assetId", "", "asset id to swap to")
	flag.StringVar(&peerPk, "peerPk", "", "asset id to swap to")
	flag.StringVar(&rfqAddr, "rfqAddr", "0.0.0.0:8096", "rfq post:hort")
	flag.Int64Var(&satsToGet, "satsToGet", 5, "sats set on the asset invoice")

	flag.StringVar(&tapTlsCertPath, "tap-tlscertPath", "/home/bob/.lit/tls.cert", "path to tap tls cert")
	flag.StringVar(&tapMacaroonPath, "tap-macaroonPath", "/home/bob/.tapd/data/testnet4/admin.macaroon", "path to lit macaroon")
	flag.StringVar(&lndtTlsCertPath, "lnd-tlscertPath", "/home/bob/.lnd/tls.cert", "path to lnd tls cert")
	flag.StringVar(&lndMacaroonPath, "lnd-macaroonPath", "/home/bob/.lnd/data/chain/bitcoin/testnet4/admin.macaroon", "path to lnd macaroon")
	flag.StringVar(&network, "network", "regtest", "which lightning network")

	flag.Parse()
}

func main() {
	setFlags()
	fmt.Printf("rpcserverLnd: %s\n", rpcServerLnd)
	fmt.Printf("rpcServerTap: %s\n", rpcServerTap)
	fmt.Printf("tapTlsCertPath: %s\n", tapTlsCertPath)
	fmt.Printf("tapMacaroonPath: %s\n", tapMacaroonPath)
	fmt.Printf("lndtTlsCertPath: %s\n", lndtTlsCertPath)
	fmt.Printf("lndMacaroonPath: %s\n", lndMacaroonPath)
	fmt.Printf("assetId: %s\n", assetId)
	fmt.Printf("peerPk: %s\n", peerPk)
	fmt.Printf("rfqAddr: %s\n", rfqAddr)
	fmt.Printf("network: %s\n", network)
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
	info, err := ln.GetInfo(context.Background(), &lnrpc.GetInfoRequest{})
	if err != nil {
		fmt.Println("error getting lnd info: ", err)
		return
	}
	fmt.Printf("LND info: %s\n", info.Alias)
	tc := taprpc.NewTaprootAssetsClient(tapConn)
	tapInfo, err := tc.GetInfo(context.Background(), &taprpc.GetInfoRequest{})
	if err != nil {
		fmt.Println("error getting tap info: ", err)
		return
	}
	fmt.Printf("TAPD info: %s\n", tapInfo)

	rc := routerrpc.NewRouterClient(lndConn)

	orc, err := rfq.NewRpcPriceOracle("rfqrpc://"+rfqAddr, false)
	if err != nil {
		fmt.Printf("error with NewRpcPriceOracle: %s", err.Error())
		return
	}

	tapChannelClient := tapchannelrpc.NewTaprootAssetChannelsClient(tapConn)
	err = SwapAssetsToSats(ln, tc, rc, tapChannelClient, orc, assetId, peerPk, satsToGet)
	if err != nil {
		fmt.Println("error swapping: ", err)
		return
	}

}

func EliglbleChannelsToSendSats(lc lnrpc.LightningClient, peerPk string) ([]uint64, error) {
	eligibleChannelIds := []uint64{}
	channels, err := lc.ListChannels(context.Background(), &lnrpc.ListChannelsRequest{})
	if err != nil {
		return []uint64{}, fmt.Errorf("error getting eligible sat channels: %v", err)
	}

	for _, channel := range channels.Channels {
		if channel.Active && len(channel.CustomChannelData) == 0 && channel.RemotePubkey == peerPk {
			eligibleChannelIds = append(eligibleChannelIds, channel.ChanId)
		}
	}
	return eligibleChannelIds, nil
}

func SwapAssetsToSats(lc lnrpc.LightningClient, tc taprpc.TaprootAssetsClient, rc routerrpc.RouterClient, tac tapchannelrpc.TaprootAssetChannelsClient, oracle *rfq.RpcPriceOracle, assetId, peerPk string, assetUnitsToGet int64) error {
	decodedAssetId, err := hex.DecodeString(assetId)
	if err != nil {
		fmt.Printf("error decoding asset id: %s", err.Error())
		return err
	}
	eligibleChannels, err := EliglbleChannelsToSendSats(lc, peerPk)
	if err != nil {
		fmt.Printf("error listing eligible channels to send sats: %s", err.Error())
		return err
	}
	bidPriceRes, err := oracle.QueryBidPrice(context.Background(), asset.NewSpecifierFromId(asset.ID(decodedAssetId)), fn.Some(uint64(0)), fn.Option[lnwire.MilliSatoshi]{}, fn.Some(rfqmsg.AssetRate{}))
	if err != nil {
		json.NewEncoder(w).Encode(struct {
			Success bool   `json:"success"`
			Error   string `json:"error"`
		}{
			Success: false,
			Error:   fmt.Sprintf("error querying bid price: %s", err.Error()),
		})

		chanInfo, err := lc.GetChanInfo(context.TODO(), &lnrpc.ChanInfoRequest{
			ChanPoint: h.swapSatsChanPoint,
		})
		if err != nil {
			json.NewEncoder(w).Encode(struct {
				Success bool   `json:"success"`
				Error   string `json:"error"`
			}{
				Success: false,
				Error:   fmt.Sprintf("error getting channel info for lightning network fees of a swap: %s", err.Error()),
			})
			return err
		}
		// Find the market makers routing policy so that we can factor in lightning network fees
		// to the quote.
		var mmRoutingPolicy *lnrpc.RoutingPolicy
		if h.marketMakerPubkey == chanInfo.Node1Pub {
			mmRoutingPolicy = chanInfo.Node1Policy
		} else {
			mmRoutingPolicy = chanInfo.Node2Policy
		}
		if mmRoutingPolicy == nil {
			fmt.Printf("mmRoutingPolicy is nil!!!!\n")
		} else {
			fmt.Printf("mmRoutingPolicy is valid\n")
		}

		cltvExpiry := uint32(0)
		feeBaseMsat := uint32(0)
		feeProportionalMillionths := uint32(0)

		return
	}
	// We bake fee in here, but so does RFQ. I think we want RFQ using real price and deal with adding the spread here.
	// apply no joltz fee here to prevent double dipping on fee?
	satsToYeildFromSwap, _ := AssetRateToSats(bidPriceRes.AssetRate.Rate, float64(req.AmountDepix), 0)
	fmt.Printf("MATH CHECK: satsToYeildFromSwaps: %d\n", satsToYeildFromSwap)
	fmt.Printf("MATH CHECK: joltzFeeSats after AssetRateToSats (as float): %f\n", float64(satsToYeildFromSwap)*0.002)
	// round up if less than 1 sat, and round up to next whole number if fractional (to Joltz benefit)
	joltzFeeSats := int(math.Ceil(float64(satsToYeildFromSwap) * 0.002)) // 0.2% fee aka 20 bips
	fmt.Printf("MATH CHECK: joltzFeeSats after AssetRateToSats: %d\n", joltzFeeSats)
	return nil
}

// feeRate should be expressed as percent e.g. to represent 0.2%, use 0.002 for feeRate
func SatsRateToAsset(rate rfqmath.BigIntFixedPoint, assetUnitsToGet, feeRate float64) (assetSwapped int) {
	fmt.Printf("SatsRateToAsset assetUnitsToGet: %f\n", assetUnitsToGet)
	unitsPerBtc := rate.Coefficient.ToFloat()
	fmt.Printf("unitsPerBtc: %f\n", unitsPerBtc)
	unitsPerSat := unitsPerBtc / 100_000_000
	fmt.Printf("unitsPerSat: %f\n", unitsPerSat)
	unitsSwappedFor := assetUnitsToGet * unitsPerSat
	fmt.Printf("unitsSwappedFor: %f\n", unitsSwappedFor)
	// any fraction of a sat remainder joltz will collect
	roundedSats := int(math.Floor(unitsSwappedFor))

	return roundedSats
}

func EliglbleChannelsToReceiveAssets(ctx context.Context, lc lnrpc.LightningClient, assetId string, peerPk string) ([]uint64, error) {
	eligibleChannelIds := []uint64{}
	channels, err := lc.ListChannels(ctx, &lnrpc.ListChannelsRequest{})
	if err != nil {
		return []uint64{}, fmt.Errorf("error getting channels: %v", err)
	}

	for _, channel := range channels.Channels {
		if len(channel.CustomChannelData) == 0 {
			continue
		}
		if peerPk != "" && channel.RemotePubkey != peerPk {
			continue
		}
		var customChannelJson CustomChannelData
		if err := json.Unmarshal(channel.CustomChannelData, &customChannelJson); err != nil {
			fmt.Printf("error unmarshalling custom channel data before payment: %v\n", err)
			return []uint64{}, fmt.Errorf("error unmarshalling custom channel data before payment: %v", err)
		}
		if customChannelJson.FundingAssets[0].AssetGenesis.AssetID != assetId {
			continue
		}
		if !channel.Active {
			continue
		}

		if customChannelJson.RemoteBalance >= 0 {
			eligibleChannelIds = append(eligibleChannelIds, channel.ChanId)
		}

	}
	return eligibleChannelIds, nil
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
