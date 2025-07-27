package api

import (
	// "crypto/rand"
	// "encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	// "time"

	// "github.com/lightninglabs/taproot-assets/taprpc"
	"github.com/lightningnetwork/lnd/lnrpc"
)

func (h *Handler) DetectChannels(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("\n\n inside detect channels\n\n")
	var req struct {
		Node1Pk string `json:"pk1"`
		Node2Pk string `json:"pk2"`
	}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		json.NewEncoder(w).Encode(struct {
			Success bool   `json:"success"`
			Error   string `json:"error"`
		}{
			Success: false,
			Error:   fmt.Sprintf("error decoding detect channel request: %s", err.Error()),
		})
		return
	}

	ctx := r.Context()
	channelGraph, err := h.lightningClient.DescribeGraph(ctx, &lnrpc.ChannelGraphRequest{IncludeUnannounced: true})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(struct {
			Error string `json:"error"`
		}{
			Error: fmt.Sprintf("error getting channel graph: %s", err.Error()),
		})
		return
	}
	openedChannelPoints := []string{}
	for _, edge := range channelGraph.Edges {
		if (edge.Node1Pub == req.Node1Pk && edge.Node2Pub == req.Node2Pk) ||
			(edge.Node1Pub == req.Node2Pk && edge.Node2Pub == req.Node1Pk) {
			openedChannelPoints = append(openedChannelPoints, edge.ChanPoint)
		}
	}

	// found a channel between the two nodes
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(struct {
		Channels []string `json:"channels"`
		Error    string   `json:"error"`
	}{
		Channels: openedChannelPoints,
		Error:    "",
	})
}

func (h *Handler) VerifyMessage(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("inside verify message\n")
	var req struct {
		Message   string `json:"message"`
		Signature string `json:"signature"`
	}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		json.NewEncoder(w).Encode(struct {
			Success bool   `json:"success"`
			Error   string `json:"error"`
		}{
			Success: false,
			Error:   fmt.Sprintf("error decoding detect channel request: %s", err.Error()),
		})
		return
	}

	ctx := r.Context()
	verifyMessageResp, err := h.lightningClient.VerifyMessage(ctx, &lnrpc.VerifyMessageRequest{
		Msg:       []byte(req.Message),
		Signature: req.Signature,
	})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(struct {
			Error string `json:"error"`
		}{
			Error: fmt.Sprintf("error verifying message: %s", err.Error()),
		})
		return
	}

	if !verifyMessageResp.Valid {
		// message is not valid - error case 2
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(struct {
			Error string `json:"error"`
		}{
			Error: "message is not valid",
		})
		return
	}

	channelGraph, err := h.lightningClient.DescribeGraph(ctx, &lnrpc.ChannelGraphRequest{IncludeUnannounced: true})
	if err != nil {
		fmt.Printf("error getting channel graph when finding the node alias: %s\n", err.Error())
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(struct {
			Pubkey string `json:"pubkey"`
			Alias  string `json:"alias"`
			Error  string `json:"error"`
		}{
			Pubkey: verifyMessageResp.Pubkey,
			Alias:  "",
			Error:  "",
		})

		for _, node := range channelGraph.Nodes {
			if node.PubKey == verifyMessageResp.Pubkey {
				fmt.Printf("found node alias: %s\n", node.Alias)
				json.NewEncoder(w).Encode(struct {
					Pubkey string `json:"pubkey"`
					Alias  string `json:"alias"`
					Error  string `json:"error"`
				}{
					Pubkey: verifyMessageResp.Pubkey,
					Alias:  node.Alias,
					Error:  "",
				})
			}
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(struct {
		Pubkey string `json:"pubkey"`
		Error  string `json:"error"`
	}{
		Pubkey: verifyMessageResp.Pubkey,
		Error:  "",
	})
}

// func (h *Handler) GetNodeAssets(w http.ResponseWriter, r *http.Request) {
// 	fmt.Printf("inside get node assets\n")

// 	// Get node public key from query parameter
// 	nodePubkey := r.URL.Query().Get("nodePubkey")
// 	if nodePubkey == "" {
// 		w.Header().Set("Content-Type", "application/json")
// 		w.WriteHeader(http.StatusBadRequest)
// 		json.NewEncoder(w).Encode(struct {
// 			Success bool   `json:"success"`
// 			Error   string `json:"error"`
// 		}{
// 			Success: false,
// 			Error:   "nodePubkey parameter is required",
// 		})
// 		return
// 	}

// 	ctx := r.Context()

// 	// Get node information (alias) from the Taproot Assets daemon
// 	var nodeAlias string

// 	// Get the TAPD info to get the node alias
// 	tapdInfo, err := h.tapClient.GetInfo(ctx, &taprpc.GetInfoRequest{})
// 	if err != nil {
// 		fmt.Printf("warning: could not get TAPD info: %s\n", err.Error())
// 		nodeAlias = "Unknown"
// 	} else if tapdInfo.LndIdentityPubkey == nodePubkey {
// 		// If the requested pubkey matches the TAPD node's LND pubkey, use its alias
// 		nodeAlias = tapdInfo.NodeAlias
// 	} else {
// 		// Otherwise, search the Lightning Network channel graph for the node
// 		channelGraph, err := h.lightningClient.DescribeGraph(ctx, &lnrpc.ChannelGraphRequest{IncludeUnannounced: true})
// 		if err != nil {
// 			fmt.Printf("warning: could not get channel graph to find node alias: %s\n", err.Error())
// 			nodeAlias = "Unknown"
// 		} else {
// 			// Find the node in the channel graph to get its alias
// 			for _, node := range channelGraph.Nodes {
// 				if node.PubKey == nodePubkey {
// 					nodeAlias = node.Alias
// 					break
// 				}
// 			}
// 			if nodeAlias == "" {
// 				nodeAlias = "Unknown"
// 			}
// 		}
// 	}

// 	// Use the tapClient to list all assets
// 	listAssetsResp, err := h.tapClient.ListAssets(ctx, &taprpc.ListAssetRequest{})
// 	if err != nil {
// 		w.Header().Set("Content-Type", "application/json")
// 		w.WriteHeader(http.StatusInternalServerError)
// 		json.NewEncoder(w).Encode(struct {
// 			Success bool   `json:"success"`
// 			Error   string `json:"error"`
// 		}{
// 			Success: false,
// 			Error:   fmt.Sprintf("error listing assets: %s", err.Error()),
// 		})
// 		return
// 	}

// 	// Filter assets by node public key if needed
// 	// Note: The tapClient.ListAssets returns assets owned by the current node
// 	// If you need to get assets from a different node, you would need to:
// 	// 1. Connect to that node's tapd instance, or
// 	// 2. Use a different approach like querying the blockchain

// 	// For now, we'll return all assets from the current node
// 	// You can modify this logic based on your specific requirements
// 	assets := []map[string]interface{}{}

// 	for _, asset := range listAssetsResp.Assets {
// 		assetInfo := map[string]interface{}{
// 			"asset_id":   asset.AssetGenesis.AssetId,
// 			"name":       asset.AssetGenesis.Name,
// 			"amount":     asset.Amount,
// 			"asset_type": asset.AssetGenesis.AssetType.String(),
// 			"meta_hash":  asset.AssetGenesis.MetaHash,
// 			"version":    asset.Version,
// 		}

// 		// Add genesis info if available
// 		if asset.AssetGenesis.GenesisPoint != "" {
// 			assetInfo["genesis_point"] = asset.AssetGenesis.GenesisPoint
// 		}

// 		assets = append(assets, assetInfo)
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(http.StatusOK)
// 	json.NewEncoder(w).Encode(struct {
// 		Success    bool                     `json:"success"`
// 		NodePubkey string                   `json:"node_pubkey"`
// 		NodeAlias  string                   `json:"node_alias"`
// 		Assets     []map[string]interface{} `json:"assets"`
// 		Count      int                      `json:"count"`
// 		Error      string                   `json:"error"`
// 	}{
// 		Success:    true,
// 		NodePubkey: nodePubkey,
// 		NodeAlias:  nodeAlias,
// 		Assets:     assets,
// 		Count:      len(assets),
// 		Error:      "",
// 	})
// }

// func (h *Handler) GenerateNWC(w http.ResponseWriter, r *http.Request) {
// 	fmt.Printf("inside generate NWC\n")

// 	var req struct {
// 		BudgetMsat  *int64 `json:"budget_msat,omitempty"`
// 		ExpiryUnix  *int64 `json:"expiry_unix,omitempty"`
// 		Description string `json:"description,omitempty"`
// 	}

// 	err := json.NewDecoder(r.Body).Decode(&req)
// 	if err != nil {
// 		// If no body provided, use defaults
// 		req.BudgetMsat = nil
// 		req.ExpiryUnix = nil
// 		req.Description = "TapHub NWC Connection"
// 	}

// 	ctx := r.Context()

// 	// Get the current node's information
// 	nodeInfo, err := h.lightningClient.GetInfo(ctx, &lnrpc.GetInfoRequest{})
// 	if err != nil {
// 		w.Header().Set("Content-Type", "application/json")
// 		w.WriteHeader(http.StatusInternalServerError)
// 		json.NewEncoder(w).Encode(struct {
// 			Success bool   `json:"success"`
// 			Error   string `json:"error"`
// 		}{
// 			Success: false,
// 			Error:   fmt.Sprintf("error getting node info: %s", err.Error()),
// 		})
// 		return
// 	}

// 	// Generate a random secret for the NWC connection
// 	secretBytes := make([]byte, 32)
// 	_, err = rand.Read(secretBytes)
// 	if err != nil {
// 		w.Header().Set("Content-Type", "application/json")
// 		w.WriteHeader(http.StatusInternalServerError)
// 		json.NewEncoder(w).Encode(struct {
// 			Success bool   `json:"success"`
// 			Error   string `json:"error"`
// 		}{
// 			Success: false,
// 			Error:   fmt.Sprintf("error generating secret: %s", err.Error()),
// 		})
// 		return
// 	}
// 	secret := hex.EncodeToString(secretBytes)

// 	// Set default values if not provided
// 	var budgetMsat int64 = 100000000 // 100,000 sats default
// 	if req.BudgetMsat != nil {
// 		budgetMsat = *req.BudgetMsat
// 	}

// 	var expiryUnix int64
// 	if req.ExpiryUnix != nil {
// 		expiryUnix = *req.ExpiryUnix
// 	} else {
// 		// Default to 30 days from now
// 		expiryUnix = time.Now().AddDate(0, 0, 30).Unix()
// 	}

// 	// Create the NWC URI
// 	// Format: nostr+walletconnect://<public_key>?relay=<relay_url>&secret=<secret>
// 	nwcURI := fmt.Sprintf("nostr+walletconnect://%s?relay=wss://relay.getalby.com&secret=%s",
// 		nodeInfo.IdentityPubkey, secret)

// 	// Create a more detailed NWC connection object
// 	nwcConnection := map[string]interface{}{
// 		"uri":         nwcURI,
// 		"public_key":  nodeInfo.IdentityPubkey,
// 		"secret":      secret,
// 		"relay":       "wss://relay.getalby.com",
// 		"budget_msat": budgetMsat,
// 		"expiry_unix": expiryUnix,
// 		"description": req.Description,
// 		"node_alias":  nodeInfo.Alias,
// 		"created_at":  time.Now().Unix(),
// 		"expires_at":  time.Unix(expiryUnix, 0).Format(time.RFC3339),
// 	}

// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(http.StatusOK)
// 	json.NewEncoder(w).Encode(struct {
// 		Success  bool                   `json:"success"`
// 		NWC      map[string]interface{} `json:"nwc"`
// 		NodeInfo map[string]interface{} `json:"node_info"`
// 		Error    string                 `json:"error"`
// 	}{
// 		Success: true,
// 		NWC:     nwcConnection,
// 		NodeInfo: map[string]interface{}{
// 			"alias":           nodeInfo.Alias,
// 			"identity_pubkey": nodeInfo.IdentityPubkey,
// 			"version":         nodeInfo.Version,
// 			"network":         nodeInfo.Chains[0].Network,
// 		},
// 		Error: "",
// 	})
// }
