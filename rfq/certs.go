package rfq

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"time"
)

var oneDay = 24 * time.Hour
var certificateType = "CERTIFICATE"
var ecPrivateKeyType = "EC PRIVATE KEY"

func generateSelfSignedCert() (*tls.Certificate, error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}

	keyUsage := x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature
	extKeyUsage := []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}
	template := x509.Certificate{
		SerialNumber: big.NewInt(0),
		Subject: pkix.Name{
			Organization: []string{"basic-price-oracle"},
		},
		NotBefore: time.Now(),
		NotAfter:  time.Now().Add(oneDay), // Valid for 1 day

		KeyUsage:              keyUsage,
		ExtKeyUsage:           extKeyUsage,
		BasicConstraintsValid: true,
	}

	certDER, err := x509.CreateCertificate(
		rand.Reader, &template, &template, &privateKey.PublicKey,
		privateKey,
	)
	if err != nil {
		return nil, err
	}

	privateKeyBits, err := x509.MarshalECPrivateKey(privateKey)
	if err != nil {
		return nil, err
	}

	certPEM := pem.EncodeToMemory(
		&pem.Block{Type: certificateType, Bytes: certDER},
	)
	keyPEM := pem.EncodeToMemory(
		&pem.Block{Type: ecPrivateKeyType, Bytes: privateKeyBits},
	)

	tlsCert, err := tls.X509KeyPair(certPEM, keyPEM)
	if err != nil {
		return nil, err
	}

	return &tlsCert, nil
}
