#!/usr/bin/env bash
# Install Betterleaks CLI into .betterleaks/bin for CI and local use.
# Used by .github/workflows/secrets.yml
set -euo pipefail

VERSION="${BETTERLEAKS_VERSION:-1.9.0}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${ROOT_DIR}/.betterleaks/bin"
DEST="${INSTALL_DIR}/betterleaks"

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"

case "${os}" in
  linux) os="linux" ;;
  darwin) os="darwin" ;;
  *)
    echo "install-betterleaks: unsupported OS '${os}'" >&2
    exit 1
    ;;
esac

case "${arch}" in
  x86_64 | amd64) arch="x64" ;;
  arm64 | aarch64) arch="arm64" ;;
  *)
    echo "install-betterleaks: unsupported arch '${arch}'" >&2
    exit 1
    ;;
esac

asset="betterleaks_${VERSION}_${os}_${arch}.tar.gz"
url="https://github.com/betterleaks/betterleaks/releases/download/v${VERSION}/${asset}"

if [[ -x "${DEST}" ]]; then
  current="$("${DEST}" version 2>/dev/null | head -1 || true)"
  if [[ "${current}" == *"${VERSION}"* ]]; then
    echo "install-betterleaks: betterleaks ${VERSION} already installed at ${DEST}"
    exit 0
  fi
fi

mkdir -p "${INSTALL_DIR}"
tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

echo "install-betterleaks: downloading ${asset} ..."
curl -sSfL "${url}" -o "${tmpdir}/${asset}"
tar -xzf "${tmpdir}/${asset}" -C "${tmpdir}"

binary="$(find "${tmpdir}" -type f -name betterleaks | head -n 1)"
if [[ -z "${binary}" ]]; then
  echo "install-betterleaks: ERROR: archive did not contain betterleaks binary" >&2
  exit 1
fi

install -m 0755 "${binary}" "${DEST}"
echo "install-betterleaks: installed $("${DEST}" version 2>/dev/null | head -1) -> ${DEST}"
