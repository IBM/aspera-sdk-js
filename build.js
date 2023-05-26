const { execSync } = require('child_process');
const fs = require('fs');

const distPackage = require('./package.json');
delete distPackage.devDependencies;
delete distPackage.scripts;
delete distPackage.husky;
delete distPackage['standard-version'];
distPackage.private = false;
distPackage.publishConfig = {
  registry: 'https://na.artifactory.swg-devops.com/artifactory/api/npm/hyc-aspera-ui-team-npm-local/'
};

console.log('Remove any existing dist directory and build compliled');
execSync('npm run build', {stdio: 'inherit'});
console.log('Build module based dist');
execSync('npm run build:module', {stdio: 'inherit'});

fs.writeFileSync('./dist/package.json', JSON.stringify(distPackage, undefined, 2));
// execSync('cp ./public-readme.md ./dist/README.md', {stdio: 'inherit'});

console.info('Deploying to Artifactory');
execSync('npm publish ./dist', {stdio: 'inherit'});
