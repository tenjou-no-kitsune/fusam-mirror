#!/bin/bash
set -ex

shortSHA="${CI_COMMIT_SHORT_SHA:=abdcef}"
SHA="${CI_COMMIT_SHA:=abdcefabdcefabdcefabdcef}"

SED="sed"
if [[ "$OSTYPE" == "darwin"* ]]; then
  SED="gsed"
fi

echo $OSTYPE

mkdir -p public
cp -r *.js *.html static manifest.json vendor public/
cd public
$SED -i -e "s#1.0.0#$shortSHA#" vendor/bcmodsdk.js
$SED -i -e "s#LOCAL_FUSAM#$shortSHA#" debug.js
$SED -i -e "s#http://localhost:3001#https://sidiousious.gitlab.io/bc-addon-loader#" config.js
$SED -i -e "s#http://localhost:3001#https://sidiousious.gitlab.io/bc-addon-loader#" loader.user.js
for f in *.js; do
    $SED -i -e "s#\"./\\([^/]*.js\\)\"#\"./$SHA.\\1\"#g" \
            -e "s#\"./$SHA\\.fusam\\.js\"#\"./fusam.js\"#g" $f
done
ls -R
for f in *.js; do
    if [ $f != "fusam.js" -a $f != "loader.user.js" ]; then
        mv $f "$SHA.$f"
    fi
done
ls -R
# bash -c "cd static; for f in *; do mv \$f \"$CI_COMMIT_SHA.\$f\"; done"
# ls && ls static
