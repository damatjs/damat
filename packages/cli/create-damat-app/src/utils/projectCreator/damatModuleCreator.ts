import boxen from "boxen";
import pc from "picocolors";
import { emojify } from "node-emoji";
import { EOL } from "os";
import { runCloneRepo } from "../actions/cloneRepo";
import { runScaffoldModule } from "../actions/scaffoldModule";
import { isAbortError } from "../commands/createAbortController";
import { displayFactBox } from "../commands/facts";
import logMessage from "../logger/message";
import prepareProject from "../actions/prepareProject";
import {
    BaseProjectCreator,
    ProjectCreator,
    ProjectOptions,
} from "./creator";
import terminalLink from "terminal-link";

// Module Project Creator
export class damatModuleCreator
    extends BaseProjectCreator
    implements ProjectCreator {
    constructor(projectName: string, options: ProjectOptions, args: string[]) {
        super(projectName, options, args);
        this.setupProcessManager();
    }

    async create(): Promise<void> {
        logMessage({
            message: `${emojify(
                ":rocket:",
            )} Starting plugin setup, this may take a few minutes.`,
        });

        this.spinner.start();
        this.factBoxOptions.interval = displayFactBox({
            ...this.factBoxOptions,
            title: "Setting up plugin...",
        });

        try {
            await this.cloneAndPrepareModule();
            this.spinner.success(pc.green("Module Prepared"));
            this.showSuccessMessage();
        } catch (e: any) {
            this.handleError(e);
        }
    }

    private async cloneAndPrepareModule(): Promise<void> {
        // Default: scaffold the module locally via the damat CLI (deterministic,
        // no dependency on a remote starter repo). Only clone when the caller
        // explicitly points at a custom starter with `--repo-url`.
        if (this.options.repoUrl) {
            await runCloneRepo({
                projectName: this.projectPath,
                repoUrl: this.options.repoUrl,
                abortController: this.abortController,
                spinner: this.spinner,
                verbose: this.options.verbose ?? false,
                isModule: true,
            });
        } else {
            await runScaffoldModule({
                name: this.projectName,
                directoryPath: this.options.directoryPath ?? "",
                version: this.options.version ?? "latest",
                abortController: this.abortController,
                spinner: this.spinner,
                verbose: this.options.verbose ?? false,
            });
        }

        this.factBoxOptions.interval = displayFactBox({
            ...this.factBoxOptions,
            message: "Created plugin directory",
        });

        await prepareProject({
            isModule: true,
            directory: this.projectPath,
            projectName: this.projectName,
            spinner: this.spinner,
            processManager: this.processManager,
            abortController: this.abortController,
            verbose: this.options.verbose ?? false,
            packageManager: this.packageManager,
        });
    }

    private handleError(e: any): void {
        if (isAbortError(e)) {
            process.exit();
        }

        const showStack = e.message.includes("bun") && e.stack;
        this.spinner.stop();
        logMessage({
            message: `An error occurred while preparing plugin: ${e}`,
            type: "error",
            stack: showStack ? e.stack! : "",
        });
    }

    protected showSuccessMessage(): void {
        logMessage({
            message: boxen(
                pc.green(
                    `Change to the \`${this.projectName
                    }\` directory to explore your damat project.${EOL}${EOL}Start your damat Module build and check out the damat ${terminalLink(
                        "GitHub",
                        "https://github.com/damatjs/damat",
                    )} and star us, if you like what we're building.`,
                ),
                {
                    titleAlignment: "center",
                    textAlignment: "center",
                    padding: 1,
                    margin: 1,
                    float: "center",
                },
            ),
        });
    }

    protected setupProcessManager(): void {
        this.processManager.onTerminated(async () => {
            this.spinner.stop();

            if (!this.printedMessage && this.isProjectCreated) {
                this.printedMessage = true;
                this.showSuccessMessage();
            }
            return;
        });
    }
}
