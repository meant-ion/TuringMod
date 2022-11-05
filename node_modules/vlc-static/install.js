import path from 'node:path';
import {arch, platform} from 'node:process';
import download from 'download';
import which from 'which';
import {pathExists} from 'path-exists';
import boxen from 'boxen';
import chalk from 'chalk';
import terminalLink from 'terminal-link';
import createEsmUtils from 'esm-utils';

const {dirname} = createEsmUtils(import.meta);

// For updating these urls, see CONTRIBUTING.md.
const urls = {
	windows: {
		x64: 'https://download.videolan.org/pub/videolan/vlc/3.0.16/win64/vlc-3.0.16-win64.zip',
		ia32: 'https://download.videolan.org/pub/videolan/vlc/3.0.16/win32/vlc-3.0.16-win32.zip',
		arm64: 'https://people.videolan.org/~jb/Builds/ARM/vlc-4.0.0-dev-20180508-aarch64.zip',
	},
};

async function downloadFile(url, destination) {
	destination = path.resolve(dirname, destination);

	if (await pathExists(destination)) {
		return;
	}

	return download(url, destination, {extract: true});
}

(async () => {
	if (platform === 'win32') {
		if (arch === 'x64') {
			return downloadFile(urls.windows.x64, 'bin/windows/x64');
		}

		if (arch === 'ia32') {
			return downloadFile(urls.windows.ia32, 'bin/windows/ia32');
		}

		if (arch === 'arm64') {
			return downloadFile(urls.windows.arm64, 'bin/windows/arm64');
		}
	}

	const resolved = await which('vlc', {nothrow: true});
	if (resolved) {
		return;
	}

	let message = `Unable to find a suitable VLC binary for you current OS. Please ${terminalLink('install VLC', 'https://www.videolan.org/vlc/#download')}.`;
	if (platform === 'linux') {
		message = `Unable to find a suitable VLC binary for Linux. If you have snapcraft installed, run ${terminalLink(chalk.grey('sudo snap install vlc'), 'snap://vlc', {fallback: false})}.`;
	}

	if (platform === 'darwin') {
		message = `Unable to find a suitable VLC binary for MacOS. Please ${terminalLink('install VLC', 'https://www.videolan.org/vlc/download-macosx.html')}.`;
	}

	console.log(boxen(message, {padding: 1, borderColor: 'yellow', borderStyle: 'round'}));
})();
