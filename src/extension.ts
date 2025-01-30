import * as vscode from "vscode";
import * as http from "http";

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "depseek-kuvi41" is now active!');

  const disposable = vscode.commands.registerCommand(
    "depseek-kuvi41.start",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "deepchat",
        "Deepseek Chat",
        vscode.ViewColumn.One,
        { enableScripts: true }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "chat") {
          const userPrompt = message.text;

          try {
            const options = {
              hostname: "192.168.100.10",
              port: 11434,
              path: "/api/generate",
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            };

            const req = http.request(options, (res) => {
              let data = "";

              res.on("data", (chunk) => {
                data += chunk;
                const lines = data.split("\n");
                data = lines.pop() || "";

                for (const line of lines) {
                  if (line.trim() === "") continue;
                  try {
                    const json = JSON.parse(line);
                    panel.webview.postMessage({
                      command: "response",
                      text: json.response,
                      done: json.done,
                    });
                  } catch (e) {
                    console.error("Error parsing JSON:", e);
                  }
                }
              });

              res.on("end", () => {
                panel.webview.postMessage({
                  command: "done",
                });
              });
            });

            req.on("error", (error) => {
              panel.webview.postMessage({
                command: "error",
                text: `Request error: ${error.message}`,
              });
            });

            req.write(
              JSON.stringify({
                model: "deepseek",
                prompt: userPrompt,
                stream: true,
              })
            );

            req.end();
          } catch (e: any) {
            panel.webview.postMessage({
              command: "error",
              text: `Error: ${e.message}`,
            });
          }
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deepseek Chat</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 1rem;
            }
            #prompt {
                width: 100%;
                height: 100px;
                box-sizing: border-box;
                margin-bottom: 1rem;
            }
            #response {
                white-space: pre-wrap;
                border: 1px solid #ccc;
                padding: 1rem;
                min-height: 200px;
                margin-top: 1rem;
            }
            #askBtn {
                padding: 0.5rem 1rem;
            }
        </style>
    </head>
    <body>
        <h2>Deepseek Chat</h2>
        <textarea id="prompt" placeholder="Enter your question here"></textarea>
        <button id="askBtn">Ask</button>
        <div id="response"></div>
        <script>
            const vscode = acquireVsCodeApi();
            const responseDiv = document.getElementById('response');
            
            document.getElementById('askBtn').addEventListener('click', () => {
                const text = document.getElementById('prompt').value;
                responseDiv.innerText = '...Thinking...';
                vscode.postMessage({ command: 'chat', text });
            });

            window.addEventListener('message', (event) => {
                const message = event.data;
                switch (message.command) {
                    case 'response':
                        if (message.done) {
                            responseDiv.innerText += '\\n\\nDone!';
                        } else {
                            responseDiv.innerText = 
                                (responseDiv.innerText === '...Thinking...' ? '' : responseDiv.innerText) 
                                + message.text;
                        }
                        break;
                    case 'error':
                        responseDiv.innerText = 'Error: ' + message.text;
                        break;
                }
            });
        </script>
    </body>
    </html>`;
}

export function deactivate() {}
