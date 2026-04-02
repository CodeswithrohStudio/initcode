#!/bin/bash
eval "$(/usr/libexec/path_helper -s)"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export NODE="/opt/homebrew/bin/node"
exec /opt/homebrew/bin/node node_modules/.bin/next dev --webpack
