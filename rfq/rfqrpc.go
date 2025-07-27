package rfq

import (
	"bytes"
	"context"
	"encoding/hex"
	"fmt"
	"log"
	"math"
	"time"

	"github.com/lightninglabs/taproot-assets/rfqmath"
	oraclerpc "github.com/lightninglabs/taproot-assets/taprpc/priceoraclerpc"
)

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
		subjectAssetRate = &oraclerpc.FixedPoint{
			Coefficient: fp.Coefficient.String(),
			Scale:       uint32(fp.Scale),
		}

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

		subjectAssetRate = &oraclerpc.FixedPoint{
			Coefficient: fp.Coefficient.String(),
			Scale:       uint32(fp.Scale),
		}

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
	fmt.Printf("\n\nRFQ WAS HIT\n\n")

	isBtc := IsAssetBtc(req.PaymentAsset)
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

func IsAssetBtc(assetSpecifier *oraclerpc.AssetSpecifier) bool {
	// An unset asset specifier does not represent BTC.
	if assetSpecifier == nil {
		return false
	}

	// Verify that the asset specifier has a valid asset ID (either bytes or
	// string). The asset ID must be all zeros for the asset specifier to
	// represent BTC.
	assetIdBytes := assetSpecifier.GetAssetId()
	assetIdStr := assetSpecifier.GetAssetIdStr()

	if len(assetIdBytes) != 32 && assetIdStr == "" {
		return false
	}

	var assetId [32]byte
	copy(assetId[:], assetIdBytes)

	var zeroAssetId [32]byte
	zeroAssetHexStr := hex.EncodeToString(zeroAssetId[:])

	isAssetIdZero := bytes.Equal(assetId[:], zeroAssetId[:]) ||
		assetIdStr == zeroAssetHexStr

	// Ensure that the asset specifier does not have any group key related
	// fields set. When specifying BTC, the group key fields must be unset.
	groupKeySet := assetSpecifier.GetGroupKey() != nil ||
		assetSpecifier.GetGroupKeyStr() != ""

	return isAssetIdZero && !groupKeySet
}
