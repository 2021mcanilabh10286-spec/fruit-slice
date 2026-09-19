/*
 * Publish the production build without cloning the source repository.
 *
 * The source repository currently tracks node_modules, which makes the
 * third-party gh-pages package exceed Windows' command-line length limit
 * while clearing its clone. This script creates an isolated temporary Git
 * repository containing only dist/ and force-pushes it to gh-pages.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const distDirectory = path.join(projectRoot, 'dist');

if (!fs.existsSync(distDirectory)) {
  throw new Error('dist/ does not exist. Run "npm run build" first.');
}

const repositoryUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
  cwd: projectRoot,
  encoding: 'utf8',
}).trim();
const publishDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fruit-cutter-pages-'));

const git = (args) => execFileSync('git', args, {
  cwd: publishDirectory,
  stdio: 'inherit',
});

try {
  fs.cpSync(distDirectory, publishDirectory, { recursive: true });
  git(['init']);
  git(['checkout', '-b', 'gh-pages']);
  git(['add', '--all']);
  git(['commit', '-m', 'Deploy game build']);
  git(['remote', 'add', 'origin', repositoryUrl]);
  git(['push', '--force', 'origin', 'HEAD:gh-pages']);
  console.log('Published dist/ to the gh-pages branch.');
} finally {
  fs.rmSync(publishDirectory, { recursive: true, force: true });
}
