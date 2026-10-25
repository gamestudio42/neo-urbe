import { app, BrowserWindow, dialog, net, protocol, session } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DIST_HOST, DIST_SCHEME, allowShellRequest, resolveDistFile } from './distFiles.js';

/**
 * Desktop window for the Neo Urbe web build.
 * City rules stay in the simulation package. This process only serves `apps/desktop/www`
 * and refuses every network request from the page.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = process.env.NEO_URBE_DIST
  ? path.resolve(process.env.NEO_URBE_DIST)
  : path.resolve(here, '../www');
const iconPath = path.resolve(here, '../assets/icon.png');

protocol.registerSchemesAsPrivileged([
  {
    scheme: DIST_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// The page unlocks audio on a click. This keeps the context from staying suspended
// when the window has no browser autoplay gesture yet.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.setName('neo-urbe');
if (process.env.NEO_URBE_USER_DATA) {
  app.setPath('userData', path.resolve(process.env.NEO_URBE_USER_DATA));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.exit(0);
} else {
  let win: BrowserWindow | null = null;

  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    protocol.handle(DIST_SCHEME, (request) => {
      const file = resolveDistFile(distDir, request.url);
      if (!file) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).href);
    });

    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ['<all_urls>'] },
      (details, callback) => {
        callback({ cancel: !allowShellRequest(distDir, details.url) });
      },
    );
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
      callback(false);
    });

    if (!existsSync(path.join(distDir, 'index.html'))) {
      dialog.showErrorBox(
        'Neo Urbe',
        `Game files were not found at ${distDir}. Run pnpm desktop:build first.`,
      );
      app.quit();
      return;
    }

    win = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 1024,
      minHeight: 640,
      title: 'Neo Urbe',
      backgroundColor: '#05070d',
      icon: existsSync(iconPath) ? iconPath : undefined,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });
    win.removeMenu();
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => {
      const next = new URL(url);
      if (next.protocol !== `${DIST_SCHEME}:` || next.hostname !== DIST_HOST) {
        event.preventDefault();
      }
    });
    void win.loadURL(`${DIST_SCHEME}://${DIST_HOST}/index.html`);
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
