#!/usr/bin/env bash
# Build VibeHome into a signed .wgt and install it on a Samsung TV in Developer Mode.
#
#   TV_HOST=192.168.1.50 tools/build-and-install.sh            # build, install, launch
#   TV_HOST=192.168.1.50 tools/build-and-install.sh uninstall  # remove it again
#
# Needs Tizen Studio (with TV Extensions + Samsung Certificate Extension) and a
# certificate profile, "vibehack" by default. See README.md, "One-time setup".
set -euo pipefail

: "${TV_HOST:?Set TV_HOST to the IP address of your TV, e.g. TV_HOST=192.168.1.50}"
CERT_PROFILE="${CERT_PROFILE:-vibehack}"
TIZEN_HOME="${TIZEN_HOME:-$HOME/tizen-studio}"
TIZEN="${TIZEN:-$TIZEN_HOME/tools/ide/bin/tizen}"
SDB="${SDB:-$TIZEN_HOME/tools/sdb}"

PKG_ID="VbHackTV01"
APP_ID="$PKG_ID.VibeHome"
SERIAL="$TV_HOST:26101"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/launcher"
BUILD="$ROOT/dist/launcher"

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die() { printf '\n\033[31mError:\033[0m %s\n' "$*" >&2; exit 1; }

[ -x "$TIZEN" ] || die "tizen CLI not found at $TIZEN. Install Tizen Studio or set TIZEN_HOME."
[ -x "$SDB" ]   || die "sdb not found at $SDB. Install Tizen Studio or set TIZEN_HOME."

say "Connecting to the TV at $SERIAL"
"$SDB" connect "$SERIAL" || true
"$SDB" devices | grep -q "$TV_HOST" || die "TV not connected. Check that Developer Mode is ON, its Host PC IP is this computer's IP, and the TV was restarted afterwards."

if [ "${1:-}" = "uninstall" ]; then
    say "Uninstalling $PKG_ID"
    "$TIZEN" uninstall -p "$PKG_ID" -s "$SERIAL"
    exit 0
fi

say "Copying launcher sources"
rm -rf "$BUILD"
mkdir -p "$(dirname "$BUILD")"
cp -R "$SRC" "$BUILD"
find "$BUILD" -name '.gitkeep' -delete
MASCOTS="$(cd "$BUILD/img/mascots" 2>/dev/null && ls *.png *.gif *.webp 2>/dev/null | tr '\n' ' ' || true)"
if [ -n "$MASCOTS" ]; then
    echo "    mascots: $MASCOTS"
else
    echo "    mascots: none (drop PNGs or GIFs into launcher/img/mascots/ to add some)"
fi

say "Building web project"
"$TIZEN" build-web -out .buildResult -- "$BUILD"

say "Packaging and signing with certificate profile '$CERT_PROFILE'"
"$TIZEN" package -t wgt -s "$CERT_PROFILE" -- "$BUILD/.buildResult"
WGT="$(ls "$BUILD"/.buildResult/*.wgt 2>/dev/null | head -n 1)"
[ -n "$WGT" ] || die "Packaging produced no .wgt. Check the certificate profile name with: $TIZEN security-profiles list"

say "Installing $(basename "$WGT")"
echo "    If this fails with 118012: Tizen Studio > Tools > Device Manager > right-click"
echo "    the TV > Permit to install applications (with this certificate profile active)."
"$TIZEN" install -n "$(basename "$WGT")" -s "$SERIAL" -- "$(dirname "$WGT")"

say "Launching VibeHome"
"$TIZEN" run -p "$APP_ID" -s "$SERIAL"

cat <<EOF

Done. VibeHome should be on screen now.
Next: pin it to the front of your Smart Hub row, then turn on
Settings > General > Smart Features > Autorun Last App (see docs/SETTINGS.md).
EOF
