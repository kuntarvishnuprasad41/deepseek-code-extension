"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const http = __importStar(require("http"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Tree Data Provider Class
class DepSeekTreeDataProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
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
function activate(context) {
    console.log('Extension "depseek-kuvi41" is now active!');
    // Register the tree data provider
    const treeDataProvider = new DepSeekTreeDataProvider();
    vscode.window.registerTreeDataProvider("depseek-sidebar", treeDataProvider);
    const disposable = vscode.commands.registerCommand("depseek-kuvi41.start", () => {
        const panel = vscode.window.createWebviewPanel("deepchat", "Deepseek Chat", vscode.ViewColumn.One, { enableScripts: true });
        panel.webview.html = getWebviewContent(context);
        setupMessageHandlers(panel);
    });
    context.subscriptions.push(disposable);
}
function setupMessageHandlers(panel) {
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "chat") {
            handleChatMessage(panel, message.text);
        }
    });
}
function handleChatMessage(panel, prompt) {
    try {
        const req = http.request({
            hostname: "ollama.vishnuprasadkuntar.me",
            port: 443,
            path: "/api/generate",
            method: "POST",
            headers: { "Content-Type": "application/json" },
        }, (res) => processResponse(panel, res));
        req.on("error", (error) => handleRequestError(panel, error));
        req.write(JSON.stringify({
            model: "deepseek-r1:8b",
            prompt: prompt,
            stream: true,
        }));
        req.end();
    }
    catch (e) {
        handleRequestError(panel, e);
    }
}
function processResponse(panel, res) {
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
            }
            catch (e) {
                console.error("JSON parse error:", e);
            }
        });
    });
    res.on("end", () => panel.webview.postMessage({ command: "done" }));
}
function handleRequestError(panel, error) {
    panel.webview.postMessage({
        command: "error",
        text: `Request error: ${error.message}`,
    });
}
function getWebviewContent(context) {
    const htmlPath = path.join(context.extensionPath, "media", "webview.html");
    const jsPath = path.join(context.extensionPath, "media", "webview.js");
    let html = fs.readFileSync(htmlPath, "utf-8");
    const js = fs.readFileSync(jsPath, "utf-8");
    // Inject JavaScript into HTML
    return html.replace('<script src="webview.js"></script>', `<script>${js}</script>`);
}
function processCodeBlocks(text) {
    return text.replace(/```(\w+)?\s*([\s\S]*?)\s*```/g, (_, lang, code) => `
        <div class="code-block">
            ${lang ? `<div class="code-header">${lang}</div>` : ""}
            <textarea class="code-textarea" readonly>${code.trim()}</textarea>
            <button class="copy-btn">Copy</button>
        </div>
    `);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map