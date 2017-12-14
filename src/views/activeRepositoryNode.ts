'use strict';
import { Functions } from '../system';
import { TextEditor, TreeItem, TreeItemCollapsibleState, window } from 'vscode';
import { ExplorerNode } from './explorerNode';
import { GitExplorer } from './gitExplorer';
import { GitUri } from '../gitService';
import { RepositoryNode } from './repositoryNode';

export class ActiveRepositoryNode extends ExplorerNode {

    private _repositoryNode: RepositoryNode | undefined;

    constructor(
        private readonly explorer: GitExplorer
    ) {
        super(undefined!);

        explorer.context.subscriptions.push(
            window.onDidChangeActiveTextEditor(Functions.debounce(this.onActiveEditorChanged, 500), this)
        );

        this.onActiveEditorChanged(window.activeTextEditor);
    }

    dispose() {
        super.dispose();

        if (this._repositoryNode !== undefined) {
            this._repositoryNode.dispose();
            this._repositoryNode = undefined;
        }
    }

    private async onActiveEditorChanged(editor: TextEditor | undefined) {
        let changed = false;

        try {
            const repoPath = await this.explorer.git.getActiveRepoPath(editor);
            if (repoPath === undefined) {
                if (this._repositoryNode !== undefined) {
                    changed = true;

                    this._repositoryNode.dispose();
                    this._repositoryNode = undefined;
                }

                return;
            }

            if (this._repositoryNode !== undefined && this._repositoryNode.repo.path === repoPath) return;

            const repo = await this.explorer.git.getRepository(repoPath);
            if (repo === undefined) {
                if (this._repositoryNode !== undefined) {
                    changed = true;

                    this._repositoryNode.dispose();
                    this._repositoryNode = undefined;
                }

                return;
            }

            changed = true;
            if (this._repositoryNode !== undefined) {
                this._repositoryNode.dispose();
            }

            this._repositoryNode = new RepositoryNode(GitUri.fromRepoPath(repo.path), repo, this.explorer, true);
        }
        finally {
            if (changed) {
                this.explorer.refreshNode(this);
            }
        }
    }

    async getChildren(): Promise<ExplorerNode[]> {
        return this._repositoryNode !== undefined
            ? this._repositoryNode.getChildren()
            : [];
    }

    getTreeItem(): TreeItem {
        return this._repositoryNode !== undefined
            ? this._repositoryNode.getTreeItem()
            : new TreeItem('No active repository', TreeItemCollapsibleState.None);
    }
}