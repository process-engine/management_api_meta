# remove "node_modules"
echo "Purging node_modules..."
find . -name "node_modules" -exec rm -rf '{}' +
echo "Done. Starting setup..."

echo "Clearing npm cache"
npm cache clean --force

# install all necessary dependencies
echo "Running npm install"
npm install --no-package-lock

if [[ "$?" -ne "0" ]]; then
  printf "\e[1;31mNPM install failed! Aborting...\e[0m\n";
  exit 1;
fi

# build all packages and schemas
meta exec "npm run build" --exclude management_api_meta

echo "done"
