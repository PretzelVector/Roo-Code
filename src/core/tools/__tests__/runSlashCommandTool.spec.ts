import { describe, it, expect, vi, beforeEach } from "vitest"
import { runSlashCommandTool } from "../RunSlashCommandTool"
import { Task } from "../../task/Task"
import { formatResponse } from "../../prompts/responses"
import { getCommand, getCommandNames } from "../../../services/command/commands"
import type { ToolUse } from "../../../shared/tools"
import { parseMentions } from "../../mentions"

// Mock dependencies
vi.mock("../../../services/command/commands", () => ({
	getCommand: vi.fn(),
	getCommandNames: vi.fn(),
}))

vi.mock("../../mentions", () => ({
	parseMentions: vi.fn(),
}))

describe("runSlashCommandTool", () => {
	let mockTask: any
	let mockCallbacks: any

	beforeEach(() => {
		vi.clearAllMocks()

		mockTask = {
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			sayAndCreateMissingParamError: vi.fn().mockResolvedValue("Missing parameter error"),
			ask: vi.fn().mockResolvedValue({}),
			cwd: "/test/project",
			urlContentFetcher: {},
			fileContextTracker: {},
			rooIgnoreController: {},
			providerRef: {
				deref: vi.fn().mockReturnValue({
					getState: vi.fn().mockResolvedValue({
						experiments: {
							runSlashCommand: true,
						},
					}),
				}),
			},
		}

		mockCallbacks = {
			askApproval: vi.fn().mockResolvedValue(true),
			handleError: vi.fn(),
			pushToolResult: vi.fn(),
			removeClosingTag: vi.fn((tag, text) => text || ""),
		}

		// Default mock for parseMentions - returns content unchanged
		vi.mocked(parseMentions).mockImplementation(async (content) => content)
	})

	it("should handle missing command parameter", async () => {
		const block: ToolUse<"run_slash_command"> = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {},
			partial: false,
		}

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		expect(mockTask.consecutiveMistakeCount).toBe(1)
		expect(mockTask.recordToolError).toHaveBeenCalledWith("run_slash_command")
		expect(mockTask.sayAndCreateMissingParamError).toHaveBeenCalledWith("run_slash_command", "command")
		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith("Missing parameter error")
	})

	it("should handle command not found", async () => {
		const block: ToolUse<"run_slash_command"> = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "nonexistent",
			},
			partial: false,
		}

		vi.mocked(getCommand).mockResolvedValue(undefined)
		vi.mocked(getCommandNames).mockResolvedValue(["init", "test", "deploy"])

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		expect(mockTask.recordToolError).toHaveBeenCalledWith("run_slash_command")
		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(
			formatResponse.toolError("Command 'nonexistent' not found. Available commands: init, test, deploy"),
		)
	})

	it("should handle user rejection", async () => {
		const block: ToolUse<"run_slash_command"> = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "init",
			},
			partial: false,
		}

		const mockCommand = {
			name: "init",
			content: "Initialize project",
			source: "built-in" as const,
			filePath: "<built-in:init>",
			description: "Initialize the project",
		}

		vi.mocked(getCommand).mockResolvedValue(mockCommand)
		mockCallbacks.askApproval.mockResolvedValue(false)

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		expect(mockCallbacks.askApproval).toHaveBeenCalled()
		expect(mockCallbacks.pushToolResult).not.toHaveBeenCalled()
	})

	it("should successfully execute built-in command", async () => {
		const block: ToolUse<"run_slash_command"> = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "init",
			},
			partial: false,
		}

		const mockCommand = {
			name: "init",
			content: "Initialize project content here",
			source: "built-in" as const,
			filePath: "<built-in:init>",
			description: "Analyze codebase and create AGENTS.md",
		}

		vi.mocked(getCommand).mockResolvedValue(mockCommand)

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		expect(mockCallbacks.askApproval).toHaveBeenCalledWith(
			"tool",
			JSON.stringify({
				tool: "runSlashCommand",
				command: "init",
				args: undefined,
				source: "built-in",
				description: "Analyze codebase and create AGENTS.md",
			}),
		)

		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(
			`Command: /init
Description: Analyze codebase and create AGENTS.md
Source: built-in

--- Command Content ---

Initialize project content here`,
		)
	})

	it("should successfully execute command with arguments", async () => {
		const block: ToolUse<"run_slash_command"> = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "test",
				args: "focus on unit tests",
			},
			partial: false,
		}

		const mockCommand = {
			name: "test",
			content: "Run tests with specific focus",
			source: "project" as const,
			filePath: ".roo/commands/test.md",
			description: "Run project tests",
			argumentHint: "test type or focus area",
		}

		vi.mocked(getCommand).mockResolvedValue(mockCommand)

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(
			`Command: /test
Description: Run project tests
Argument hint: test type or focus area
Provided arguments: focus on unit tests
Source: project

--- Command Content ---

Run tests with specific focus`,
		)
	})

	it("should handle global command", async () => {
		const block: ToolUse<"run_slash_command"> = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "deploy",
			},
			partial: false,
		}

		const mockCommand = {
			name: "deploy",
			content: "Deploy application to production",
			source: "global" as const,
			filePath: "~/.roo/commands/deploy.md",
		}

		vi.mocked(getCommand).mockResolvedValue(mockCommand)

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(
			`Command: /deploy
Source: global

--- Command Content ---

Deploy application to production`,
		)
	})

	it("should handle partial block", async () => {
		const block: ToolUse<"run_slash_command"> = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "init",
			},
			partial: true,
		}

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		expect(mockTask.ask).toHaveBeenCalledWith(
			"tool",
			JSON.stringify({
				tool: "runSlashCommand",
				command: "init",
				args: "",
			}),
			true,
		)

		expect(mockCallbacks.pushToolResult).not.toHaveBeenCalled()
	})

	it("should handle errors during execution", async () => {
		const block: ToolUse<"run_slash_command"> = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "init",
			},
			partial: false,
		}

		const error = new Error("Test error")
		vi.mocked(getCommand).mockRejectedValue(error)

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		expect(mockCallbacks.handleError).toHaveBeenCalledWith("running slash command", error)
	})

	it("should handle empty available commands list", async () => {
		const block: ToolUse<"run_slash_command"> = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "nonexistent",
			},
			partial: false,
		}

		vi.mocked(getCommand).mockResolvedValue(undefined)
		vi.mocked(getCommandNames).mockResolvedValue([])

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(
			formatResponse.toolError("Command 'nonexistent' not found. Available commands: (none)"),
		)
	})

	it("should reset consecutive mistake count on valid command", async () => {
		const block: ToolUse<"run_slash_command"> = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "init",
			},
			partial: false,
		}

		mockTask.consecutiveMistakeCount = 5

		const mockCommand = {
			name: "init",
			content: "Initialize project",
			source: "built-in" as const,
			filePath: "<built-in:init>",
		}

		vi.mocked(getCommand).mockResolvedValue(mockCommand)

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		expect(mockTask.consecutiveMistakeCount).toBe(0)
	})

	it("should process file mentions in command content", async () => {
		const block = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "review",
			},
			partial: false,
		}

		const mockCommand = {
			name: "review",
			content: "Please review the code in @/src/utils/helper.ts and provide feedback.",
			source: "project" as const,
			filePath: ".roo/commands/review.md",
			description: "Review code files",
		}

		vi.mocked(getCommand).mockResolvedValue(mockCommand)
		vi.mocked(parseMentions).mockResolvedValue(
			`Please review the code in 'src/utils/helper.ts' (see below for file content) and provide feedback.

<file_content path="src/utils/helper.ts">
export function formatDate(date: Date): string {
		return date.toISOString();
}
</file_content>`,
		)

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		// Verify parseMentions was called with the command content
		expect(parseMentions).toHaveBeenCalledWith(
			mockCommand.content,
			mockTask.cwd,
			mockTask.urlContentFetcher,
			mockTask.fileContextTracker,
			mockTask.rooIgnoreController,
			false, // showRooIgnoredFiles
			true, // includeDiagnosticMessages
			50, // maxDiagnosticMessages
			undefined, // maxReadFileLine
		)

		// Verify the result includes both the processed mention text and the XML block
		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(
			expect.stringContaining("'src/utils/helper.ts' (see below for file content)"),
		)
		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(
			expect.stringContaining('<file_content path="src/utils/helper.ts">'),
		)
		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(expect.stringContaining("export function formatDate"))
	})

	it("should process file mentions in command content", async () => {
		const block = {
			type: "tool_use" as const,
			name: "run_slash_command" as const,
			params: {
				command: "review",
			},
			partial: false,
		}

		const mockCommand = {
			name: "review",
			content: "Please review the code in @/src/utils/helper.ts and provide feedback.",
			source: "project" as const,
			filePath: ".roo/commands/review.md",
			description: "Review code files",
		}

		vi.mocked(getCommand).mockResolvedValue(mockCommand)
		vi.mocked(parseMentions).mockResolvedValue(
			`Please review the code in 'src/utils/helper.ts' (see below for file content) and provide feedback.

<file_content path="src/utils/helper.ts">
export function formatDate(date: Date): string {
		return date.toISOString();
}
</file_content>`,
		)

		await runSlashCommandTool.handle(mockTask as Task, block, mockCallbacks)

		// Verify parseMentions was called with the command content
		expect(parseMentions).toHaveBeenCalledWith(
			mockCommand.content,
			mockTask.cwd,
			mockTask.urlContentFetcher,
			mockTask.fileContextTracker,
			mockTask.rooIgnoreController,
			false, // showRooIgnoredFiles
			true, // includeDiagnosticMessages
			50, // maxDiagnosticMessages
			undefined, // maxReadFileLine
		)

		// Verify the result includes both the processed mention text and the XML block
		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(
			expect.stringContaining("'src/utils/helper.ts' (see below for file content)"),
		)
		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(
			expect.stringContaining('<file_content path="src/utils/helper.ts">'),
		)
		expect(mockCallbacks.pushToolResult).toHaveBeenCalledWith(expect.stringContaining("export function formatDate"))
	})
})
