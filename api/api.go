package api

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/lightninglabs/taproot-assets/rfq"

	"github.com/lightninglabs/taproot-assets/taprpc/universerpc"

	"github.com/lightninglabs/taproot-assets/taprpc"
	"github.com/lightningnetwork/lnd/lnrpc"
)

type proxy struct {
	proxy *httputil.ReverseProxy
}
type Handler struct {
	// litRpcURI on-demand for account-level client connections.
	litRpcURI       string
	lightningClient lnrpc.LightningClient
	tapClient       taprpc.TaprootAssetsClient
	universeClient  universerpc.UniverseClient
	oracleProxy     *proxy
	oracle          *rfq.RpcPriceOracle
}

func newProxy(target string, prefix string) (*proxy, error) {
	u, err := url.Parse(target)
	if err != nil {
		return nil, err
	}

	t := &*http.DefaultTransport.(*http.Transport)

	t.TLSClientConfig = &tls.Config{
		InsecureSkipVerify: true,
	}

	p := &httputil.ReverseProxy{
		Transport: t,

		Director: func(r *http.Request) {
			r.URL.Scheme = u.Scheme
			r.URL.Host = u.Host
			r.URL.Path = strings.TrimPrefix(r.URL.Path, prefix)
		},
	}

	return &proxy{p}, nil
}

func New(lightningClient lnrpc.LightningClient, tapClient taprpc.TaprootAssetsClient, universeClient universerpc.UniverseClient, oracleWeb, oracle string, enableRfq bool) (*Handler, error) {
	fmt.Printf("inside api new\n")
	var o *proxy
	var orc *rfq.RpcPriceOracle
	var err error
	if enableRfq {
		o, err = newProxy("https://"+oracleWeb, "/v1/oracle/proxy")
		if err != nil {
			return nil, err
		}

		orc, err = rfq.NewRpcPriceOracle("rfqrpc://"+oracle, false)
		if err != nil {
			return nil, err
		}
	}

	return &Handler{
		oracleProxy: o,
		oracle:      orc,

		lightningClient: lightningClient,
		tapClient:       tapClient,
		universeClient:  universeClient,
	}, nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	mux := http.NewServeMux()
	mux.HandleFunc("/detectChannels", h.DetectChannels)
	mux.HandleFunc("/verifyMessage", h.VerifyMessage)
	mux.HandleFunc("/verifyProof", h.VerifyProof)

	mux.ServeHTTP(w, r)
}

func (h *Handler) Auth(next http.HandlerFunc) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {

	}
}
