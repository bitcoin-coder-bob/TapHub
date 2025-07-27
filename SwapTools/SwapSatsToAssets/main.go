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
	"time"

	"github.com/lightningnetwork/lnd/lnrpc/routerrpc"
	"github.com/lightningnetwork/lnd/lnwire"

	"github.com/lightninglabs/taproot-assets/rfqmath"

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

var assetUnitsToGet int64
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
	flag.Int64Var(&assetUnitsToGet, "assetUnitsToGet", 5, "asset units set on the asset invoice")

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
	err = SwapSatsToAsset(ln, tc, rc, tapChannelClient, orc, assetId, peerPk, assetUnitsToGet)
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

func SwapSatsToAsset(lc lnrpc.LightningClient, tc taprpc.TaprootAssetsClient, rc routerrpc.RouterClient, tac tapchannelrpc.TaprootAssetChannelsClient, oracle *rfq.RpcPriceOracle, assetId, peerPk string, assetUnitsToGet int64) error {

	// get all channel ids we want to pay the sats over
	eligibleChannels, err := EliglbleChannelsToSendSats(lc, peerPk)
	if err != nil {
		fmt.Printf("error listing eligible channels to send sats: %s", err.Error())
		return err
	}
	fmt.Printf("eligible chan ids: %v\n", eligibleChannels)
	assetHex, err := hex.DecodeString(assetId)
	if err != nil {
		return err
	}

	marketMakerHex, err := hex.DecodeString(peerPk)
	if err != nil {
		return err
	}

	// res, err := oracle.QueryAskPrice(context.Background(), asset.NewSpecifierFromId(asset.ID(assetHex)), fn.Some(uint64(0)), fn.Option[lnwire.MilliSatoshi]{}, fn.Some(rfqmsg.AssetRate{}))
	// if err != nil {
	// 	panic(err)
	// }
	fmt.Printf("did query ask price\n")
	cc1, err := lc.ListChannels(context.Background(), &lnrpc.ListChannelsRequest{})
	if err != nil {
		fmt.Printf("error listing channels 1: %s", err.Error())
		return err
	}
	for _, ch := range cc1.Channels {
		if len(ch.CustomChannelData) > 0 {
			var customChannelJson CustomChannelData
			if err := json.Unmarshal(ch.CustomChannelData, &customChannelJson); err != nil {
				fmt.Printf("error unmarshalling custom channel data before payment: %v\n", err)
				return err
			}
			scid1 := lnwire.NewShortChanIDFromInt(ch.ChanId)
			fmt.Printf("checking local bal before (asset): scid: %s chid: %d cp: %s  local bal: %d  remote bal: %d    asset bal:%d private: %t\n", scid1, ch.ChanId, ch.ChannelPoint, ch.LocalBalance, ch.RemoteBalance, customChannelJson.LocalBalance, ch.Private)
		} else {
			scid1 := lnwire.NewShortChanIDFromInt(ch.ChanId)

			fmt.Printf("checking local bal before (sats): scid: %s  chid: %d cp: %s   local bal: %d   remote bal: %d\n", scid1, ch.ChanId, ch.ChannelPoint, ch.LocalBalance, ch.RemoteBalance)
		}
	}

	// node1Info, err := lnrpc.NewLightningClient(h.conn).GetInfo(context.Background(), &lnrpc.GetInfoRequest{})
	// if err != nil {
	// 	fmt.Printf("error getting node info: %v\n", err)
	// 	return
	// }

	// fee was already deducted in sats, so use 0 fee here

	eligibleAssetChannels, err := EliglbleChannelsToReceiveAssets(context.Background(), lc, assetId, peerPk)
	if err != nil {
		fmt.Printf("error getting eligible asset channels: %v\n", err)
		return err
	}
	fmt.Printf("eligible asset channels: %v\n", eligibleAssetChannels)
	if len(eligibleAssetChannels) == 0 {
		fmt.Printf("no eligible asset channels found\n")
		return err
	}

	aliases, err := lc.ListAliases(context.Background(), &lnrpc.ListAliasesRequest{})
	if err != nil {
		fmt.Printf("error getting channel aliases: %v\n", err)
		return err
	}

	scidToUse := uint64(0)
	for _, alias := range aliases.AliasMaps {
		if alias.BaseScid == eligibleAssetChannels[0] {
			fmt.Printf("all scids: %v\n", alias.Aliases)
			candidateScid := alias.Aliases[len(alias.Aliases)-1]
			if candidateScid > scidToUse {
				scidToUse = candidateScid
			}
		}
	}
	fmt.Printf("using scid for route hint of taproot asset channel: %d\n", scidToUse)
	// unitsRequestingFromSwap := SatsRateToAsset(res.AssetRate.Rate, float64(assetUnitsToGet), 0)
	fmt.Printf("unitsRequestingFromSwap setting on asset invoice: %d\n", assetUnitsToGet)
	paymentRequest, err := tac.AddInvoice(context.TODO(), &tapchannelrpc.AddInvoiceRequest{
		AssetId:     assetHex,
		AssetAmount: uint64(assetUnitsToGet),

		// we will need to populate this if we have multiple asset channels on our node
		PeerPubkey: marketMakerHex,
		InvoiceRequest: &lnrpc.Invoice{
			Expiry: 300,
		},
	})
	if err != nil {
		fmt.Printf("error generating asset invoice: %s", err.Error())
		return err
	}
	fmt.Printf("scid used in accepted buy quote: %d\n", paymentRequest.AcceptedBuyQuote.Scid)
	fmt.Printf("invoice payment request str: %s\n", paymentRequest.InvoiceResult.PaymentRequest)
	lookedupInvoice, err := lc.LookupInvoice(context.TODO(), &lnrpc.PaymentHash{RHash: paymentRequest.InvoiceResult.RHash})
	if err != nil {
		fmt.Printf("error looking up invoice: %s\n", err.Error())
		return err
	}
	fmt.Printf("old scid used: %d  but now updating to: %d\n", scidToUse, paymentRequest.AcceptedBuyQuote.Scid)
	scidToUse = paymentRequest.AcceptedBuyQuote.Scid
	fmt.Printf("value: %d\n", lookedupInvoice.Value)
	fmt.Printf("\n\n\n\n\n----------------about to kick off payment------------\n\n\n\n")

	paymentClient, err := rc.SendPaymentV2(
		context.TODO(), &routerrpc.SendPaymentRequest{
			PaymentRequest:    paymentRequest.InvoiceResult.PaymentRequest,
			TimeoutSeconds:    60,
			AllowSelfPayment:  true,
			OutgoingChanIds:   eligibleChannels,
			DestCustomRecords: make(map[uint64][]byte),
			FeeLimitMsat:      200000,
			MaxParts:          16,
		},
	)
	if err != nil {
		fmt.Printf("error with sending swap payment from the sats side: %s", err.Error())
		return err
	}
	payment := &lnrpc.Payment{}
	for {
		payment, err = paymentClient.Recv()
		if err != nil {
			return err
		}
		status := payment.Status
		if status == lnrpc.Payment_IN_FLIGHT || status == lnrpc.Payment_INITIATED {
			continue
		} else if status == lnrpc.Payment_SUCCEEDED {
			break
		} else if status == lnrpc.Payment_FAILED {
			fmt.Printf("payment failed with reason: %s\n", payment.FailureReason.String())
			return err
		}
	}
	fmt.Printf("\npayment succeeded with fee: %d status: %s\n", payment.FeeMsat, payment.Status.String())
	time.Sleep(time.Second * 5)
	fmt.Printf("ASSET ID USED: %s\n", assetId)
	// fmt.Printf("\nproposed first hop: %d\n", eligibleChannels[0])
	// fmt.Printf("proposed last hop: %d\n", eligibleAssetChannels[0])
	fmt.Printf("\nproposed hop: (scid): %d  chid: %d\n", scidToUse, eligibleAssetChannels[0])

	ch, err := lc.ListChannels(context.Background(), &lnrpc.ListChannelsRequest{})
	assetChid := uint64(0)
	if err != nil {
		fmt.Printf("error listing channels 2: %s\n", err.Error())
		return err
	}
	for _, c := range ch.Channels {
		if c.CustomChannelData != nil {
			assetChid = c.ChanId
			break
		}
	}
	fmt.Printf("asset chid: %d\n", assetChid)
	for htlcIndex, htlc := range payment.Htlcs {
		route := htlc.Route
		for hopIndex, hop := range route.Hops {
			fmt.Printf("hop taken chid: %d pubkey:%s  assetChan: %t  htlcIndex: %d  hopIndex: %d\n", hop.ChanId, hop.PubKey, hop.ChanId == assetChid, htlcIndex, hopIndex)
			// if index == 1 {
			// 	scid := lnwire.NewShortChanIDFromInt(hop.ChanId)
			// 	fmt.Printf("hop taken scid: %s\n", scid.String())
			// 	scid2 := lnwire.NewShortChanIDFromInt(eligibleChannels[0])
			// 	scid3 := lnwire.NewShortChanIDFromInt(eligibleChannels[len(eligibleChannels)-1])
			// 	fmt.Printf("scid 2: %s\n", scid2.String())
			// 	fmt.Printf("scid 3: %s\n", scid3.String())

			// 	fmt.Printf("chan info chanid: %v\n", chi.ChannelId)
			// 	fmt.Printf("chan info channelpoint: %v\n", chi.ChannelId)

			// }
		}
	}
	fmt.Println("")
	aliases, err = lc.ListAliases(context.Background(), &lnrpc.ListAliasesRequest{})
	if err != nil {
		fmt.Printf("error getting channel aliases: %v\n", err)
		return err
	}

	for _, alias := range aliases.AliasMaps {
		for _, aliasInt := range alias.Aliases {
			fmt.Printf("base scid: %d  alias: %d\n", alias.BaseScid, aliasInt)
		}
	}
	fmt.Println("")

	inv := &lnrpc.Invoice{}

	// check the state of the invoice, sleep until its resolved
	for {
		fmt.Printf("checking invoice state...\n")
		inv, err = lc.LookupInvoice(context.TODO(), &lnrpc.PaymentHash{RHashStr: payment.PaymentHash})
		if err != nil {
			fmt.Printf("error looking up invoice: %v\n", err)
			return err
		}
		if inv.State == lnrpc.Invoice_OPEN {
			fmt.Printf("invoice still open...sleeping and checking again in 5 seconds\n")
			time.Sleep(time.Second * 5)
			continue
		} else if inv.State == lnrpc.Invoice_SETTLED {
			fmt.Printf("invoice was settled\n")
			break
		} else if inv.State == lnrpc.Invoice_CANCELED {
			fmt.Printf("invoice was canceled\n")
			return err
		} else if inv.State == lnrpc.Invoice_ACCEPTED {
			fmt.Printf("invoice was accepted...sleeping and checking again in 5 seconds\n")
			time.Sleep(time.Second * 5)
			continue
		}
	}
	fmt.Printf("invoice state: %v   amt: %d\n", inv.State.String(), inv.AmtPaidSat)

	cc2, err := lc.ListChannels(context.Background(), &lnrpc.ListChannelsRequest{})
	if err != nil {
		fmt.Printf("error listing channels 3: %s", err.Error())
		return err
	}
	fmt.Println("")
	for _, ch := range cc2.Channels {
		if len(ch.CustomChannelData) > 0 {
			var customChannelJson CustomChannelData
			if err := json.Unmarshal(ch.CustomChannelData, &customChannelJson); err != nil {
				fmt.Printf("error unmarshalling custom channel data after payment: %v\n", err)
				return err
			}
			fmt.Printf("checking local bal after (asset): chid: %d   local bal: %d  remote bal: %d     asset bal:%d\n", ch.ChanId, ch.LocalBalance, ch.RemoteBalance, customChannelJson.LocalBalance)
		} else {
			fmt.Printf("checking local bal after (sats):  chid: %d  local bal: %d   remote bal: %d\n", ch.ChanId, ch.LocalBalance, ch.RemoteBalance)
		}
	}

	fmt.Printf("\n\nswap done!\n\n")

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
