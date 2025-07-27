package api

import (
	"encoding/json"
	"fmt"
	"net/http"

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
		// failed to get response from node - error case 1
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
	return
}
