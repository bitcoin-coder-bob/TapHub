package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/lightninglabs/taproot-assets/taprpc"
	"github.com/lightninglabs/taproot-assets/taprpc/universerpc"

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
	fmt.Printf("=== VERIFY MESSAGE CALLED ===\n")
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

	fmt.Printf("Received message: %s\n", req.Message)
	fmt.Printf("Received signature: %s\n", req.Signature)

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

	fmt.Printf("=== LND VERIFICATION RESULT ===\n")
	fmt.Printf("Valid: %v\n", verifyMessageResp.Valid)
	fmt.Printf("Pubkey: %s\n", verifyMessageResp.Pubkey)
	fmt.Printf("==============================\n")

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

func (h *Handler) VerifyProof(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("\n\n inside VerifyProof\n\n")
	var req struct {
		AssetName    string `json:"assetName"`
		RawProofFile []byte `json:"rawProofFile"`
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

	assetsStatQuery := universerpc.AssetStatsQuery{
		AssetNameFilter: req.AssetName,
		AssetTypeFilter: universerpc.AssetTypeFilter_FILTER_ASSET_NORMAL,
	}

	genesisPoint := ""
	assetsStatsResp, err := h.universeClient.QueryAssetStats(context.Background(), &assetsStatQuery)
	for _, snapshot := range assetsStatsResp.AssetStats {
		if snapshot.Asset.AssetName == req.AssetName {
			fmt.Printf("found asset %s with genesis point %s\n", req.AssetName, snapshot.Asset.GenesisPoint)
			genesisPoint = snapshot.Asset.GenesisPoint
			break
		}
	}

	if genesisPoint == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(struct {
			Error string `json:"error"`
		}{
			Error: fmt.Sprintf("asset %s not found", req.AssetName),
		})
		return
	}

	ctx := r.Context()
	proofFail := taprpc.ProofFile{
		RawProofFile: req.RawProofFile,
		GenesisPoint: genesisPoint,
	}
	verifyProofResp, err := h.tapClient.VerifyProof(ctx, &proofFail)
	if err != nil {
		// message is not valid - error case 2
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(struct {
			Error string `json:"error"`
		}{
			Error: fmt.Sprintf("verify proof failed: %s", err.Error()),
		})
		return
	}
	if !verifyProofResp.Valid {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(struct {
			Error string `json:"error"`
		}{
			Error: "proof is not valid",
		})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(struct {
		Success bool   `json:"success"`
		Error   string `json:"error"`
	}{
		Success: true,
		Error:   "",
	})
	fmt.Printf("proof is valid for asset %s\n", req.AssetName)
}
