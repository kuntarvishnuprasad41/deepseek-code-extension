import * as vscode from "vscode";
import * as http from "http";
import * as path from "path";
import * as fs from "fs";

// Tree Data Provider Class
class DepSeekTreeDataProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined
  > = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> =
    this._onDidChangeTreeData.event;

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (!element) {
      // Return root items in the sidebar
      return Promise.resolve([
        new vscode.TreeItem("Item 1"),
        new vscode.TreeItem("Item 2"),
      ]);
    }
    return Promise.resolve([]);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "depseek-kuvi41" is now active!');

  // Register the tree data provider
  const treeDataProvider = new DepSeekTreeDataProvider();
  vscode.window.registerTreeDataProvider("depseek-sidebar", treeDataProvider);

  const disposable = vscode.commands.registerCommand(
    "depseek-kuvi41.start",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "deepchat",
        "Deepseek Chat",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = getWebviewContent(context);
      setupMessageHandlers(panel);
    }
  );

  context.subscriptions.push(disposable);
}

function setupMessageHandlers(panel: vscode.WebviewPanel) {
  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === "chat") {
      handleChatMessage(panel, message.text);
    }
  });
}

function handleChatMessage(panel: vscode.WebviewPanel, prompt: string) {
  try {
    const req = http.request(
      {
        hostname: "192.168.100.10",
        port: 11434,
        path: "/api/generate",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (res) => processResponse(panel, res)
    );

    req.on("error", (error) => handleRequestError(panel, error));
    req.write(
      JSON.stringify({
        model: "deepseek-r1:8b",
        prompt: prompt,
        stream: true,
      })
    );
    req.end();
  } catch (e: any) {
    handleRequestError(panel, e);
  }
}

function processResponse(
  panel: vscode.WebviewPanel,
  res: http.IncomingMessage
) {
  let buffer = "";

  res.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    lines.forEach((line) => {
      if (!line.trim()) {
        return {};
      }
      try {
        const json = JSON.parse(line);
        panel.webview.postMessage({
          command: "response",
          text: processCodeBlocks(json.response),
          done: json.done,
        });
      } catch (e) {
        console.error("JSON parse error:", e);
      }
    });
  });

  res.on("end", () => panel.webview.postMessage({ command: "done" }));
}

function handleRequestError(panel: vscode.WebviewPanel, error: Error) {
  panel.webview.postMessage({
    command: "error",
    text: `Request error: ${error.message}`,
  });
}

function getWebviewContent(context: vscode.ExtensionContext): string {
  const htmlPath = path.join(context.extensionPath, "media", "webview.html");
  const jsPath = path.join(context.extensionPath, "media", "webview.js");

  let html = fs.readFileSync(htmlPath, "utf-8");
  const js = fs.readFileSync(jsPath, "utf-8");

  // Inject JavaScript into HTML
  return html.replace(
    '<script src="webview.js"></script>',
    `<script>${js}</script>`
  );
}

function processCodeBlocks(text: string): string {
  return text.replace(
    /```(\w+)?\s*([\s\S]*?)\s*```/g,
    (_, lang, code) => `
        <div class="code-block">
            ${lang ? `<div class="code-header">${lang}</div>` : ""}
            <textarea class="code-textarea" readonly>${code.trim()}</textarea>
            <button class="copy-btn">Copy</button>
        </div>
    `
  );
}

export function deactivate() {}
