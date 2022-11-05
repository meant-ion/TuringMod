import path from 'node:path';
import {arch, platform} from 'node:process';
import {globbySync} from 'globby';
import which from 'which';
import createEsmUtils from 'esm-utils';
import onetime from 'onetime';

const {dirname} = createEsmUtils(import.meta);

const resolve = pattern => path.resolve(dirname, globbySync(pattern, {cwd: dirname})[0]);

function vlcStatic() {
	if (platform === 'win32') {
		if (arch === 'x64') {
			return resolve('./bin/windows/x64/*/vlc.exe');
		}

		if (arch === 'ia32') {
			return resolve('./bin/windows/ia32/*/vlc.exe');
		}

		return resolve('./bin/windows/arm64/*/vlc.exe');
	}

	const resolved = which.sync('vlc', {nothrow: true});
	if (resolved) {
		return resolved;
	}

	let message = 'Unable to find a suitable VLC binary for you current OS. Please install VLC.';
	if (platform === 'linux') {
		message = 'Unable to find a suitable VLC binary for Linux. If you have snapcraft installed, run `sudo snap install vlc`.';
	}

	if (platform === 'darwin') {
		message = 'Unable to find a suitable VLC binary for MacOS. Please install VLC.';
	}

	throw new Error(message);
}

export default onetime(vlcStatic);
