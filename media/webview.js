const vscode = acquireVsCodeApi();
const responseDiv = document.getElementById('response');

document.getElementById('askBtn').addEventListener('click', () => {
    const text = document.getElementById('prompt').value;
    responseDiv.innerHTML = '...Thinking...';
    // text = text + '\n If it is small code within 10-20 lines, make sure that the declaration and call and usage are in the same codeblock to make it efficient'
    vscode.postMessage({ command: 'chat', text });
});

window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.command) {
        case 'response':
            handleResponse(message);
            break;
        case 'error':
            responseDiv.innerHTML = `Error: ${message.text}`;
            break;
        case 'done':
            wrapCodeBlocks();
            break;
    }
});

function handleResponse(message) {
    if (message.done) {
        responseDiv.innerHTML += '<br>Done!';
    } else {
        responseDiv.innerHTML = (responseDiv.innerHTML === '...Thinking...' ? '' : responseDiv.innerHTML) + message.text;
    }
}

function wrapCodeBlocks() {
    const content = responseDiv.innerHTML;
    const wrappedContent = content.replace(/```([\s\S]*?)```/g, (match, code) => {
        const languageMatch = code.match(/^\s*(\w+)/);
        const language = languageMatch ? languageMatch[1] : '';
        const codeContent = code.replace(/^\s*\w+\s*/, '');
        return `
            <div class="code-block">
                <div class="code-header">${language}</div>
                <textarea class="code-textarea" readonly>${codeContent.trim()}</textarea>
                <button class="copy-btn">Copy</button>
            </div>
        `;
    });

    responseDiv.innerHTML = wrappedContent;
    addCopyListeners();
}

function addCopyListeners() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const textarea = btn.previousElementSibling;
            copyToClipboard(textarea.value, btn);
        });
    });
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        button.textContent = 'Copied!';
        setTimeout(() => button.textContent = 'Copy', 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}