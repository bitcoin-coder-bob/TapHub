package main

import (
	"context"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"math"
	"os"

	"github.com/lightninglabs/taproot-assets/taprpc/rfqrpc"

	"github.com/lightningnetwork/lnd/lnrpc/routerrpc"

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

type ChannelData struct {
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

func setFlags() {
	flag.StringVar(&rpcServerLnd, "rpcserverLnd", "127.0.0.1:10009", "rpc server of node")
	flag.StringVar(&rpcServerTap, "rpcserverTap", "127.0.0.1:10009", "rpc server of node")
	flag.StringVar(&assetId, "assetId", "", "asset id to swap to")
	flag.StringVar(&peerPk, "peerPk", "", "asset id to swap to")
	flag.StringVar(&rfqAddr, "rfqAddr", "0.0.0.0:8096", "rfq post:hort")
	flag.Int64Var(&satsToGet, "satsToGet", 5000, "sats set on the sat invoice")

	flag.StringVar(&tapTlsCertPath, "tap-tlscertPath", "/home/bob/.lit/tls.cert", "path to tap tls cert")
	flag.StringVar(&tapMacaroonPath, "tap-macaroonPath", "/home/bob/.tapd/data/testnet4/admin.macaroon", "path to lit macaroon")
	flag.StringVar(&lndtTlsCertPath, "lnd-tlscertPath", "/home/bob/.lnd/tls.cert", "path to lnd tls cert")
	flag.StringVar(&lndMacaroonPath, "lnd-macaroonPath", "/home/bob/.lnd/data/chain/bitcoin/testnet4/admin.macaroon", "path to lnd macaroon")
	flag.StringVar(&network, "network", "regtest", "which lightning network")

	flag.Parse()
}

func main() {
	setFlags()
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

	rc := routerrpc.NewRouterClient(lndConn)
	rfqClient := rfqrpc.NewRfqClient(tapConn)

	orc, err := rfq.NewRpcPriceOracle("rfqrpc://"+rfqAddr, false)
	if err != nil {
		fmt.Printf("error with NewRpcPriceOracle: %s", err.Error())
		return
	}

	tapChannelClient := tapchannelrpc.NewTaprootAssetChannelsClient(tapConn)
	err = SwapAssetsToSats(ln, tc, rc, rfqClient, tapChannelClient, orc, assetId, peerPk, satsToGet)
	if err != nil {
		fmt.Println("error swapping: ", err)
		return
	}

}

func EliglbleChannelsToReceiveSats(lc lnrpc.LightningClient, peerPk string) ([]*lnrpc.Channel, error) {
	eligibleChannelPoints := []*lnrpc.Channel{}
	channels, err := lc.ListChannels(context.Background(), &lnrpc.ListChannelsRequest{})
	if err != nil {
		return []*lnrpc.Channel{}, fmt.Errorf("error getting eligible sat channels: %v", err)
	}

	for _, channel := range channels.Channels {
		if channel.Active && len(channel.CustomChannelData) == 0 && channel.RemotePubkey == peerPk {
			eligibleChannelPoints = append(eligibleChannelPoints, channel)
		}
	}
	return eligibleChannelPoints, nil
}

func EliglbleChannelsToSendAssets(lc lnrpc.LightningClient, peerPk string) ([]*lnrpc.Channel, error) {
	eligibleChannelPoints := []*lnrpc.Channel{}
	channels, err := lc.ListChannels(context.Background(), &lnrpc.ListChannelsRequest{})
	if err != nil {
		return []*lnrpc.Channel{}, fmt.Errorf("error getting eligible sat channels: %v", err)
	}

	for _, channel := range channels.Channels {
		if channel.Active && len(channel.CustomChannelData) != 0 && channel.RemotePubkey == peerPk {
			eligibleChannelPoints = append(eligibleChannelPoints, channel)
		}
	}
	return eligibleChannelPoints, nil
}

func SwapAssetsToSats(lc lnrpc.LightningClient, tc taprpc.TaprootAssetsClient, rc routerrpc.RouterClient, rfqClient rfqrpc.RfqClient, tac tapchannelrpc.TaprootAssetChannelsClient, oracle *rfq.RpcPriceOracle, assetId, peerPk string, satsToGet int64) error {
	// decodedAssetId, err := hex.DecodeString(assetId)
	// if err != nil {
	// 	fmt.Printf("error decoding asset id: %s", err.Error())
	// 	return err
	// }
	eligibleSatChannels, err := EliglbleChannelsToReceiveSats(lc, peerPk)
	if err != nil {
		fmt.Printf("error listing eligible channels to receive sats: %s", err.Error())
		return err
	}
	if len(eligibleSatChannels) == 0 {
		return fmt.Errorf("no eligible channels to receive sats")
	}
	eligibleAssetChannels, err := EliglbleChannelsToSendAssets(lc, peerPk)
	if err != nil {
		fmt.Printf("error listing eligible channels to send assets: %s", err.Error())
		return err
	}
	if len(eligibleAssetChannels) == 0 {
		return fmt.Errorf("no eligible channels to send assets")
	}
	chosenSatsChannel := eligibleSatChannels[0]
	chosenAssetChannel := eligibleAssetChannels[0]

	remotePkBytes, err := hex.DecodeString(chosenAssetChannel.RemotePubkey)
	if err != nil {
		return fmt.Errorf("error decoding remote pubkey: %s", err.Error())
	}

	// bidPriceRes, err := oracle.QueryBidPrice(context.Background(), asset.NewSpecifierFromId(asset.ID(decodedAssetId)), fn.Some(uint64(0)), fn.Option[lnwire.MilliSatoshi]{}, fn.Some(rfqmsg.AssetRate{}))
	// if err != nil {
	// 	return fmt.Errorf("error querying bid price: %s", err.Error())
	// }

	chanInfo, err := lc.GetChanInfo(context.TODO(), &lnrpc.ChanInfoRequest{
		ChanPoint: chosenSatsChannel.ChannelPoint,
	})
	if err != nil {
		return fmt.Errorf("error getting channel info for lightning network fees of a swap: %s", err.Error())
	}

	// Find the market makers routing policy so that we can factor in lightning network fees
	// to the quote.
	var mmRoutingPolicy *lnrpc.RoutingPolicy
	if chosenSatsChannel.RemotePubkey == chanInfo.Node1Pub {
		mmRoutingPolicy = chanInfo.Node1Policy
	} else {
		mmRoutingPolicy = chanInfo.Node2Policy
	}

	cltvExpiry := uint32(0)
	feeBaseMsat := uint32(0)
	feeProportionalMillionths := uint32(0)

	// fallback to 0 values if we don't have a policy (usually the case for simnet/playground)
	if mmRoutingPolicy != nil {
		cltvExpiry = mmRoutingPolicy.TimeLockDelta
		feeBaseMsat = uint32(mmRoutingPolicy.FeeBaseMsat)
		feeProportionalMillionths = uint32(mmRoutingPolicy.FeeRateMilliMsat)
	} else {
		cltvExpiry = uint32(80)
		feeBaseMsat = uint32(1000)
		feeProportionalMillionths = uint32(1)
	}
	// Convert base fee from msat to sats.
	baseFeeSats := feeBaseMsat / 1_000
	// Use the variable fee rate to determine that part of the fee.
	varFeeMsats := (int(satsToGet) * int(feeProportionalMillionths)) / 1_000_000
	// Convert the variable fee from msat to sats.
	varFeeSats := varFeeMsats / 1_000
	totalLNFeeSats := int(baseFeeSats) + varFeeSats
	assetSellOfferRes, err := rfqClient.AddAssetSellOrder(context.TODO(), &rfqrpc.AddAssetSellOrderRequest{
		AssetSpecifier: &rfqrpc.AssetSpecifier{
			Id: &rfqrpc.AssetSpecifier_AssetIdStr{
				AssetIdStr: assetId,
			},
		},
		PaymentMaxAmt:  uint64(1000 * (int(satsToGet) + totalLNFeeSats)), // bake in a buffer?
		Expiry:         30,
		TimeoutSeconds: 30,
		PeerPubKey:     remotePkBytes, // required
	})

	var (
		rfqQuoteId     []byte
		quotedAssetAmt uint64
	)
	switch r := assetSellOfferRes.Response.(type) {
	case *rfqrpc.AddAssetSellOrderResponse_AcceptedQuote:
		acceptedQuote := r.AcceptedQuote
		rfqQuoteId = acceptedQuote.Id
		quotedAssetAmt = acceptedQuote.AssetAmount
		// Double-check the asset balance of the account against this quoted amount (should typically be less than user input though).

	case *rfqrpc.AddAssetSellOrderResponse_InvalidQuote:
		invalidQuote := r.InvalidQuote

		return fmt.Errorf("invalid quote: %s", invalidQuote.Status.String())
	case *rfqrpc.AddAssetSellOrderResponse_RejectedQuote:
		rejectedQuote := r.RejectedQuote

		return fmt.Errorf("rejected quote: %s", rejectedQuote.ErrorMessage)
	default:

		return fmt.Errorf("unknown rfq response: %T", r)
	}

	fmt.Printf("\nsat value on invoice: %d\n", satsToGet)
	invoice, err := lc.AddInvoice(context.TODO(), &lnrpc.Invoice{
		Value: int64(satsToGet),
	})
	if err != nil {
		fmt.Printf("error adding invoice: %s", err.Error())
	}

	var swapAssetChanId uint64 = 0

	swapSatsPeerScidAlias := uint64(0)

	// The string of the invoice we will pay with asset
	paymentReq := invoice.PaymentRequest
	allChannels, err := lc.ListChannels(context.TODO(), &lnrpc.ListChannelsRequest{})
	if err != nil {
		return fmt.Errorf("error listing all channels: %s", err.Error())
	}
	for _, c := range allChannels.Channels {
		if c.CustomChannelData != nil {
			var customData ChannelData
			if err := json.Unmarshal(c.CustomChannelData, &customData); err != nil {
				return fmt.Errorf("error parsing custom channel data: %s", err.Error())
			}
			if c.ChannelPoint == chosenAssetChannel.ChannelPoint {
				// Set asset chan info.
				swapAssetChanId = c.ChanId
			}
		} else {
			if c.ChannelPoint == chosenSatsChannel.ChannelPoint {
				// Set sats chan info.
				swapSatsPeerScidAlias = c.PeerScidAlias
			}
		}
	}
	hopHints := []*lnrpc.HopHint{
		{
			NodeId: chosenAssetChannel.RemotePubkey,
			ChanId: swapSatsPeerScidAlias,
			// NEED THESE FIELDS FOR SOME REASON
			CltvExpiryDelta:           cltvExpiry,
			FeeBaseMsat:               feeBaseMsat,
			FeeProportionalMillionths: feeProportionalMillionths,
		},
	}
	pr := &routerrpc.SendPaymentRequest{
		PaymentRequest:   paymentReq,
		OutgoingChanIds:  []uint64{swapAssetChanId},
		AllowSelfPayment: true,
		FeeLimitSat:      20000,
		RouteHints: []*lnrpc.RouteHint{{
			HopHints: hopHints,
		},
		},
	}
	assetHex, err := hex.DecodeString(assetId)
	if err != nil {
		return fmt.Errorf("error decoding asset id: %s", err.Error())
	}

	stream, err := tac.SendPayment(context.TODO(), &tapchannelrpc.SendPaymentRequest{
		AssetId:        assetHex,
		PeerPubkey:     remotePkBytes,
		PaymentRequest: pr,
		AllowOverpay:   true,
		AssetAmount:    quotedAssetAmt,
		RfqId:          rfqQuoteId,
	})
	if err != nil {
		return fmt.Errorf("error sending asset payment for swap: %s", err.Error())
	}

	success, assetsSent, err := TrackSwapPayment(stream)
	if err != nil {
		return fmt.Errorf("error with payment for swap: %s", err.Error())
	}

	if !success {
		// should not hit here, as TrackSwapPayment should have yielded an error
		return fmt.Errorf("swap failed")
	}
	fmt.Printf("Asset units sent: %d\n", assetsSent)
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

// Track the stream of an asset payment, returning success status, amount of asset sent, and possible error
func TrackSwapPayment(stream tapchannelrpc.TaprootAssetChannels_SendPaymentClient) (bool, uint64, error) {
	assetUnitsSent := uint64(0)
	for {
		p, err := stream.Recv()
		if err != nil {
			if errors.Is(err, io.EOF) {
				fmt.Printf("stream closed\n")
				return assetUnitsSent > 0, assetUnitsSent, nil
			}
			return false, 0, fmt.Errorf("error with stream tracking payment: %s", err.Error())
		}

		switch result := p.Result.(type) {
		case *tapchannelrpc.SendPaymentResponse_AcceptedSellOrder:
			fmt.Printf("\nReceived accepted sell order\n\n")
			continue
		case *tapchannelrpc.SendPaymentResponse_PaymentResult:
			// Handle PaymentResult
			payment := result.PaymentResult
			status := payment.Status
			// fmt.Printf("--- tracking payment got status: %s  num htlcs: %d   value enum: %v\n", status.String(), len(payment.Htlcs), status)
			// for _, htlcAttempt := range payment.Htlcs {
			// 	fmt.Printf("htlc attempt in payment\n")
			// 	for _, hop := range htlcAttempt.Route.Hops {
			// 		fmt.Printf("hop chid: %d   pk: %s\n", hop.ChanId, hop.PubKey)
			// 	}
			// }
			fmt.Printf("payment status: %s\n", status.String())

			if status == lnrpc.Payment_IN_FLIGHT ||
				status == lnrpc.Payment_INITIATED {
				continue
			}
			if status == lnrpc.Payment_SUCCEEDED {
				fmt.Printf("PAYMENT SUCCESS: fee paid: %d sat(s)\n", payment.FeeSat)
				fmt.Printf("PAYMENT SUCCESS: sats received: %d\n\n", payment.ValueSat)
				var PaymentCustomChannelData PaymentCustomChannelData
				if len(payment.Htlcs) == 0 {
					return false, 0, fmt.Errorf("no htlcs found for payment")

				}
				if payment.Htlcs[0].Route == nil {
					return false, 0, fmt.Errorf("no route found for payment")
				}

				if len(payment.Htlcs[0].Route.CustomChannelData) == 0 {
					return false, 0, fmt.Errorf("no custom data found in payment")
				}

				err := json.Unmarshal(payment.Htlcs[0].Route.CustomChannelData, &PaymentCustomChannelData)
				if err != nil {
					return false, 0, fmt.Errorf("error unmarshaling custom channel data in payment: %s", err.Error())
				}
				assetUnitsSent = uint64(PaymentCustomChannelData.Balances[0].Amount)

				return true, assetUnitsSent, nil
			}
			if status == lnrpc.Payment_FAILED {
				fmt.Printf("-- payment failed with num htlcs: %d\n", len(payment.Htlcs))
				for _, htlcAttempt := range payment.Htlcs {
					fmt.Printf("here is the route with %d hops\n", len(htlcAttempt.Route.Hops))
					for _, hop := range htlcAttempt.Route.Hops {
						fmt.Printf("hop pk: %s hop chan id: %d\n", hop.PubKey, hop.ChanId)
					}
				}
				return false, 0, fmt.Errorf("payment failed: %s", payment.FailureReason.String())
			}

		default:
			return false, 0, fmt.Errorf("unknown payment response type")
		}
	}
}

// CustomChannelData represents the top-level JSON structure
type PaymentCustomChannelData struct {
	Balances []Balance `json:"balances"`
	RfqID    string    `json:"rfq_id"`
}

// Balance represents each balance entry in the balances array
type Balance struct {
	AssetID string `json:"asset_id"`
	Amount  int64  `json:"amount"`
}
