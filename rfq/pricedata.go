package rfq

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type BitPrecoResponse struct {
	Success   bool    `json:"success"`
	Market    string  `json:"market"`
	Last      float64 `json:"last"`
	High      float64 `json:"high"`
	Low       float64 `json:"low"`
	Vol       float64 `json:"vol"`
	Avg       float64 `json:"avg"`
	Var       float64 `json:"var"`
	Buy       float64 `json:"buy"`
	Sell      float64 `json:"sell"`
	Timestamp string  `json:"timestamp"`
}

func GetBitPrecoPrice(mdc *MarketDataConfig) error {
	resp, err := http.Get(mdc.PriceDataUrl)
	if err != nil {
		return fmt.Errorf("failed to get bitpreco price: %w", err)
	}
	defer resp.Body.Close()

	var data BitPrecoResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return fmt.Errorf("failed to decode bitpreco response: %w", err)
	}

	if !data.Success {
		return fmt.Errorf("bitpreco API returned unsuccessful response")
	}
	indexPrice := data.Last
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
