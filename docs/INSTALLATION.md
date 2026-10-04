# Installing on macOS

[← Back to Caderninho](../README.md)

The app is distributed here as source code. To build the package locally, you need Node.js and npm installed.

## Build the app

Download or clone this project and, in the Caderninho folder, run:

```sh
npm ci
npm run package
```

The package is built for the architecture of the Mac in use. On an Apple Silicon Mac, the result is at:

```text
dist/Caderninho-darwin-arm64/Caderninho.app
```

## Install and open

Close the previous version before replacing it. On an Apple Silicon Mac:

```sh
mkdir -p ~/Applications
ditto dist/Caderninho-darwin-arm64/Caderninho.app ~/Applications/Caderninho.app
open ~/Applications/Caderninho.app
```

On an Intel Mac, use the `Caderninho-darwin-x64` folder instead of `Caderninho-darwin-arm64`.

Updating the app preserves the local data folder. Installation requires no account or sign-up.

## First steps

The app interface is in Portuguese; labels are shown as they appear in the app, followed by their English meaning.

1. Open Caderninho to see the Daily page.
2. Create your notebooks in **Cadernos** (Notebooks).
3. Open **Notas** (Notes), **Tarefas** (Tasks) or **Lembretes** (Reminders) to create a page.
4. Wait for the save confirmation before closing the app.

See the [user guide](USER_GUIDE.md) to learn the shortcuts and set up reminders.
