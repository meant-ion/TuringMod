# vlc

An interface to VLC Media Player.

## Highlights

- Automatic command encoding and delivery.
- Automatic port acquisition.
- TypeScript support.
- Bundled binaries.
- No native dependencies.
- Actively maintained.

## Install

```sh
npm install @richienb/vlc
```

## Usage

```js
import createVlc from '@richienb/vlc';

const vlc = await createVlc();

// Play audio
await vlc.command('in_play', {
	input: 'audio-file.mp3',
});

// Pause/resume audio
await vlc.command('pl_pause');
```

## API

### createVlc()

Returns a promise which resolves with the vlc instance.

### vlc.info()

Get the current player status. Returns a promise.

### vlc.playlist()

Get the current playlist information. Returns a promise.

### vlc.command(command, options?)

Execute a command on the player. Returns a promise that resolves when the command has been sent.

#### command

Type: `string`

The [command](https://wiki.videolan.org/VLC_HTTP_requests#Full_command_list) to execute.
