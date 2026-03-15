#!/bin/bash
set -e

# Checks if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required to install the OpenBlog CLI."
    exit 1
fi

echo "Installing OpenBlog CLI dependencies globally..."
npm install -g commander axios

echo "Copying CLI to /usr/local/bin/openblog..."
if [ -w /usr/local/bin ]; then
   cp cli.js /usr/local/bin/openblog
   chmod +x /usr/local/bin/openblog
else
   sudo cp cli.js /usr/local/bin/openblog
   sudo chmod +x /usr/local/bin/openblog
fi

echo "Installation complete!"
echo "Usage: export OPENBLOG_API_KEY=\"<key>\" && openblog --help"