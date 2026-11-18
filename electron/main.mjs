// Processo principal do app desktop: abre uma janela com o export estático do Next (pasta out/).
// O HTML usa caminhos absolutos (/_next/...), que quebram em file://, então servimos out/
// por um protocolo próprio app://local/ que mapeia a URL para o arquivo dentro de out/.
import { app, BrowserWindow, net, protocol, shell } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";

const outDir = path.join(app.getAppPath(), "out");

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serveOut(request) {
  let pathname = decodeURIComponent(new URL(request.url).pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const filePath = path.join(outDir, pathname);
  // Bloqueia "../" para fora de out/.
  if (path.relative(outDir, filePath).startsWith("..")) {
    return new Response("Not found", { status: 404 });
  }
  return net.fetch(pathToFileURL(filePath).toString());
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    icon: path.join(app.getAppPath(), "electron", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  // Links externos abrem no navegador padrão, nunca dentro do app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("app://local/")) event.preventDefault();
  });

  win.loadURL("app://local/");
}

app.whenReady().then(() => {
  protocol.handle("app", serveOut);
  createWindow();
});

app.on("window-all-closed", () => app.quit());
