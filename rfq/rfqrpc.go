package rfq

import (
	"context"
	"encoding/hex"
	"fmt"
	"log"
	"math"
	"time"

	"github.com/lightninglabs/taproot-assets/rfqmath"
	"github.com/lightninglabs/taproot-assets/rpcutils"
	oraclerpc "github.com/lightninglabs/taproot-assets/taprpc/priceoraclerpc"
)

// 11 comes from fact that there are 10^11 msats per 1 btc = 100,000,000,000 msats per bitcoin
var decimalsPerMsat = float64(11)

func isMatchingAsset(assetSpecifier *oraclerpc.AssetSpecifier, desiredAssetId string) bool {
	// An unset asset specifier does not represent BTC
	if assetSpecifier == nil {
		return false
	}

	bytes := assetSpecifier.GetAssetId()
	encoded := hex.EncodeToString(bytes)

	return desiredAssetId == encoded
}

// getAssetRates returns a rate tick for a given transaction type and subject
// asset max amount.
func (p *RpcPriceOracleServer) getAssetRates(transactionType oraclerpc.TransactionType,
	subjectAssetMaxAmount uint64) (oraclerpc.AssetRates, error) {
	if subjectAssetMaxAmount > uint64(p.cfg.MaxAssetTradeAmount) {
		return oraclerpc.AssetRates{}, fmt.Errorf("subject asset amount (%d) exceeds max value: %d", subjectAssetMaxAmount, p.cfg.MaxAssetTradeAmount)
	}
	unitMultiplier := math.Pow(10, float64(p.cfg.DecimalDisplay))
	var subjectAssetRate *oraclerpc.FixedPoint
	// PURCHASE is when user is sending X number of sats for asset units
	// can also be said as selling sats for asset units
	// can also be said as buying asset units for sats
	// ask/offer price
	if transactionType == oraclerpc.TransactionType_PURCHASE {
		p.cfg.WriteReceivePriceMu.Lock()
		realPerBtc := p.cfg.LatestAskPrice
		p.cfg.WriteReceivePriceMu.Unlock()

		fp := rfqmath.FixedPointFromUint64[rfqmath.BigInt](
			uint64(realPerBtc*unitMultiplier), 0,
		)
		subjectAssetRate, _ = rpcutils.MarshalBigIntFixedPoint(fp)

		log.Printf("Type: PURCHASE quoted rate(%s per 1 BTC): %f\n", p.cfg.Ticker, realPerBtc)
	} else {
		// SALE is when user is sending X number of asset units for sats
		// can also be said as buying sats using asset units
		// can also be said as selling asset units for sats
		// bid price
		p.cfg.WriteSendPriceMu.Lock()
		realPerBtc := p.cfg.LatestBidPrice
		p.cfg.WriteSendPriceMu.Unlock()

		fp := rfqmath.FixedPointFromUint64[rfqmath.BigInt](
			uint64(realPerBtc*unitMultiplier), 0,
		)

		subjectAssetRate, _ = rpcutils.MarshalBigIntFixedPoint(fp)

		log.Printf("Type: SELL quoted rate(%s per 1 BTC): %f\n", p.cfg.Ticker, realPerBtc)
	}

	expiry := time.Now().Add(time.Minute * 5).Unix()

	// rate is expressed as: mSats per unit (this will end up being units per mSat in upcoming taproot-asset releases)
	return oraclerpc.AssetRates{
		ExpiryTimestamp:  uint64(expiry),
		SubjectAssetRate: subjectAssetRate,
	}, nil
}

func (p *RpcPriceOracleServer) QueryAssetRates(_ context.Context,
	req *oraclerpc.QueryAssetRatesRequest) (
	*oraclerpc.QueryAssetRatesResponse, error) {
	isBtc := rpcutils.IsAssetBtc(req.PaymentAsset)
	if !isBtc {
		return &oraclerpc.QueryAssetRatesResponse{
			Result: &oraclerpc.QueryAssetRatesResponse_Error{
				Error: &oraclerpc.QueryAssetRatesErrResponse{
					Message: fmt.Sprintf("unsupported payment asset: (name: %s, id: %s). RFQ supports: (name: %s, id: %s)", req.PaymentAsset.GetAssetIdStr(), req.PaymentAsset.GetAssetId(), "BTC", p.cfg.BtcAssetId),
				},
			},
		}, nil
	}

	// Ensure that the subject asset is set.
	if req.SubjectAsset == nil {
		return nil, fmt.Errorf("subject asset is not set")
	}

	// Ensure that the subject asset is supported.
	found := false

	if len(p.cfg.DesiredAssetIds) == 0 {
		found = true
	}

	for _, id := range p.cfg.DesiredAssetIds {
		if isMatchingAsset(req.SubjectAsset, id) {
			found = true
			break
		}
	}

	if !found {
		return &oraclerpc.QueryAssetRatesResponse{
			Result: &oraclerpc.QueryAssetRatesResponse_Error{
				Error: &oraclerpc.QueryAssetRatesErrResponse{
					Message: fmt.Sprintf("unsupported subject asset: (name: %s, id: %s). RFQ supports the following taproot asset ids: (ids: %+v)", req.SubjectAsset.GetAssetIdStr(), req.SubjectAsset.GetAssetId(), p.cfg.DesiredAssetIds),
				},
			},
		}, nil
	}

	// use our rate tick, do not use rate tick hint even if provided
	assetRates, err := p.getAssetRates(
		req.TransactionType, req.SubjectAssetMaxAmount,
	)
	if err != nil {
		return &oraclerpc.QueryAssetRatesResponse{
			Result: &oraclerpc.QueryAssetRatesResponse_Error{
				Error: &oraclerpc.QueryAssetRatesErrResponse{
					Message: fmt.Sprintf("error getting rate tick: %s", err.Error()),
				},
			},
		}, nil
	}
	return &oraclerpc.QueryAssetRatesResponse{
		Result: &oraclerpc.QueryAssetRatesResponse_Ok{
			Ok: &oraclerpc.QueryAssetRatesOkResponse{
				AssetRates: &assetRates,
			},
		},
	}, nil
}
