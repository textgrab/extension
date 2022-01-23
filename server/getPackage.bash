#! /bin/bash
# a script to save the deployment package with gcp-creds
# ignoring git ignored attributes to deployed on EB
git archive HEAD -o deployed.zip
mkdir deploymentPackage
mv deployed.zip deploymentPackage
cd deploymentPackage
unzip deployed.zip
rm deployed.zip
cp ../gcp-creds.json .
rm .gitignore
zip -r deployed.zip .
mv deployed.zip ../
cd ..
rm -rf deploymentPackage