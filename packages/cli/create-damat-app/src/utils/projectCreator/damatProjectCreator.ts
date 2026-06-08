import boxen from "boxen";
import pc from "picocolors";
import { emojify } from "node-emoji";
import { EOL } from "os";
import { runCloneRepo } from "../actions/cloneRepo";
import { isAbortError } from "../commands/createAbortController";
import { displayFactBox } from "../commands/facts";
import logMessage from "../logger/message";
import prepareProject from "../actions/prepareProject";
import startDamat from "../commands/startDamat";
import {
    BaseProjectCreator,
    ProjectCreator,
    ProjectOptions,
} from "./creator";
import terminalLink from "terminal-link";

// damat Project Creator
export class damatProjectCreator
    extends BaseProjectCreator
    implements ProjectCreator {

    constructor(projectName: string, options: ProjectOptions, args: string[]) {
        super(projectName, options, args);
        this.setupProcessManager();
    }

    async create(): Promise<void> {
        try {
            await this.initializeProject();
            await this.setupProject();
            await this.startServices();
        } catch (e: any) {
            this.handleError(e);
        }
    }

    private async initializeProject(): Promise<void> {

        logMessage({
            message: `${emojify(
                ":rocket:",
            )} Starting project setup, this should be up and running shortly.`,
        });

        this.spinner.start();

        this.factBoxOptions.interval = displayFactBox({
            ...this.factBoxOptions,
            title: "Setting up project...",
        });

        await runCloneRepo({
            projectName: this.projectPath,
            repoUrl: this.options.repoUrl ?? "",
            abortController: this.abortController,
            spinner: this.spinner,
            verbose: this.options.verbose ?? false,
            isModule: false,
        });

        this.factBoxOptions.interval = displayFactBox({
            ...this.factBoxOptions,
            message: "Created project directory",
        });
    }

    private async setupProject(): Promise<void> {
        try {
            await prepareProject({
                isModule: false,
                projectName: this.projectName,
                directory: this.projectPath,
                spinner: this.spinner,
                processManager: this.processManager,
                abortController: this.abortController,
                verbose: this.options.verbose ?? false,
                packageManager: this.packageManager,
                version: this.options.version ?? "latest",
            });
        } finally {
        }

        this.spinner.success(pc.green("Project Prepared"));
    }

    private async startServices(): Promise<void> {
        logMessage({
            message: "Starting damat...",
        });

        startDamat({
            directory: this.projectPath,
            abortController: this.abortController,
            packageManager: this.packageManager,
        });

        this.isProjectCreated = true;
    }

    private handleError(e: Error): void {
        if (isAbortError(e)) {
            process.exit();
        }

        const showStack = e.message.includes("bun") && e.stack;

        this.spinner.stop();
        logMessage({
            message: `An error occurred: ${e}`,
            type: "error",
            stack: showStack ? e.stack! : "",
        });
    }

    protected showSuccessMessage(): void {
        const commandStr = this.packageManager.getCommandStr(`dev`);
        logMessage({
            message: boxen(
                pc.green(
                    `Change to the \`${this.projectName
                    }\` directory to explore your damat project.${EOL}${EOL}Start your damat application again with the following command:${EOL}${EOL}${commandStr}${EOL}${EOL}
                    Check out the damat ${terminalLink(
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
