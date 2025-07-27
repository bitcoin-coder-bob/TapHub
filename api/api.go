package api

import (
	"crypto/tls"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/lightninglabs/taproot-assets/taprpc"
	"github.com/lightningnetwork/lnd/lnrpc"
)

type proxy struct {
	proxy *httputil.ReverseProxy
}
type Handler struct {
	oracleProxy *proxy
	// litRpcURI on-demand for account-level client connections.
	litRpcURI       string
	lightningClient lnrpc.LightningClient
	tapClient       taprpc.TaprootAssetsClient
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

func New(lightningClient lnrpc.LightningClient, tapClient taprpc.TaprootAssetsClient) (*Handler, error) {
	// o, err := newProxy("https://"+oracleWeb, "/v1/oracle/proxy")
	// if err != nil {
	// 	return nil, err
	// }

	return &Handler{
		// oracleProxy:     o,
		lightningClient: lightningClient,
		tapClient:       tapClient,
	}, nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	mux := http.NewServeMux()
	mux.HandleFunc("/detectChannels", h.DetectChannels)
	mux.HandleFunc("/verifyMessage", h.VerifyMessage)
	mux.ServeHTTP(w, r)
}

func (h *Handler) Auth(next http.HandlerFunc) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {

	}
}
