import {fixturePath, loadFixture} from './support';

export namespace CertPaths {
  export const privateCsr = fixturePath('private-csr.pem');
  export const privateKey = fixturePath('private-key.pem');
  export const publicCert = fixturePath('public-cert.pem');
  export const publicKey = fixturePath('public-key.pem');
  export const tlsCert = fixturePath('tls-cert.pem');
  export const tlsKey = fixturePath('tls-key.pem');
  export const wrongCert = fixturePath('wrong-cert.pem');
  export const wrongCsr = fixturePath('wrong-csr.pem');
  export const wrongKey = fixturePath('wrong-key.pem');
}

export namespace Certs {
  export const privateCsr = loadFixture('private-csr.pem');
  export const privateKey = loadFixture('private-key.pem');
  export const publicCert = loadFixture('public-cert.pem');
  export const publicKey = loadFixture('public-key.pem');
  export const tlsCert = loadFixture('tls-cert.pem');
  export const tlsKey = loadFixture('tls-key.pem');
  export const wrongCert = loadFixture('wrong-cert.pem');
  export const wrongCsr = loadFixture('wrong-csr.pem');
  export const wrongKey = loadFixture('wrong-key.pem');
}
