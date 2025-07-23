// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Collects a limited snapshot of the workspace for analysis.
 */
async function gatherWorkspaceSnapshot(root: string, maxFiles = 20, maxChars = 1000): Promise<string> {
    const exclude = new Set(['node_modules', '.git', 'dist', 'out']);
    const files: string[] = [];
    function walk(dir: string) {
        if (files.length >= maxFiles) {
            return;
        }
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!exclude.has(entry.name)) {
                    walk(full);
                }
            } else if (files.length < maxFiles) {
                files.push(full);
            }
            if (files.length >= maxFiles) {
                break;
            }
        }
    }
    walk(root);
    let result = '';
    for (const file of files) {
        try {
            const rel = path.relative(root, file);
            const content = fs.readFileSync(file, 'utf8').slice(0, maxChars);
            result += `\nFile: ${rel}\n${content}\n`;
        } catch {
            // ignore read errors
        }
    }
    return result;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "project-whisperer-ai" is now active.');

    const disposable = vscode.commands.registerCommand('project-whisperer-ai.analyzeProject', async () => {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showInformationMessage('Open a workspace to analyze.');
            return;
        }

        const root = folders[0].uri.fsPath;
        const snapshot = await gatherWorkspaceSnapshot(root);

        const panel = vscode.window.createWebviewPanel(
            'projectWhisperer',
            'Project Whisperer Result',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = `<html><body><pre>${snapshot.replace(/</g, '&lt;')}</pre></body></html>`;
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
