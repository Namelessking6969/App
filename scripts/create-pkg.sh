#!/bin/bash
# Create PKG installer for VibeTerminal (macOS)
# Run this AFTER successful build

set -e

PROJECT_NAME="VibeTerminal"
BUILD_DIR="./build"
PKG_OUTPUT="./dist"

echo "=== Creating PKG Installer ==="

APP_PATH="$BUILD_DIR/DerivedData/Build/Products/Release/$PROJECT_NAME.app"

if [ ! -d "$APP_PATH" ]; then
    echo "Error: App not found at $APP_PATH"
    echo "Run build.sh first!"
    exit 1
fi

# Create output directory
mkdir -p "$PKG_OUTPUT"

# Create product metadata
PRODUCT_NAME="$PROJECT_NAME"
PRODUCT_VERSION="3.0.25"
IDENTIFIER="com.vibeterminal.app"

# Create PKG using productbuild
echo "Creating PKG..."
productbuild --component "$APP_PATH" \
    --component-plist /System/Library/Frameworks/CoreFoundation.framework/Resources/Info.plist \
    --sign "-" \
    "$PKG_OUTPUT/$PROJECT_NAME.pkg"

echo ""
echo "=== PKG Created ==="
echo "Location: $PKG_OUTPUT/$PROJECT_NAME.pkg"