with import <nixpkgs> {}; stdenv.mkDerivation { name = "malloy"; buildInputs = [ nodejs_24 google-cloud-sdk git cacert fakeroot]; }
