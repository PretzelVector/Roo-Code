import React from "react"
import {
	LayoutList,
	Settings,
	X,
	ListTodo,
	Globe,
	Server,
	MessageSquareCode,
	BookOpenText,
	FileDiff,
} from "lucide-react"

import { vscode } from "@/utils/vscode"

import { cn } from "@/lib/utils"

import { useExtensionState } from "@/context/ExtensionStateContext"

import { useAppTranslation } from "@/i18n/TranslationContext"

import { useAutoApprovalToggles } from "@/hooks/useAutoApprovalToggles"
import { useAutoApprovalState } from "@/hooks/useAutoApprovalState"

import { useRooPortal } from "@/components/ui/hooks/useRooPortal"

import { Popover, PopoverContent, PopoverTrigger, StandardTooltip, ToggleSwitch, Button } from "@/components/ui"

import { AutoApproveSetting, autoApproveSettingsConfig } from "../settings/AutoApproveToggle"

interface AutoApproveDropdownProps {
	disabled?: boolean
	triggerClassName?: string
}

export const AutoApproveDropdown = ({ disabled = false, triggerClassName = "" }: AutoApproveDropdownProps) => {
	const [open, setOpen] = React.useState(false)
	const portalContainer = useRooPortal("roo-portal")
	const { t } = useAppTranslation()

	const {
		autoApprovalEnabled,
		setAutoApprovalEnabled,
		alwaysApproveResubmit,
		setAlwaysAllowReadOnly,
		setAlwaysAllowWrite,
		setAlwaysAllowExecute,
		setAlwaysAllowBrowser,
		setAlwaysAllowMcp,
		setAlwaysAllowModeSwitch,
		setAlwaysAllowSubtasks,
		setAlwaysApproveResubmit,
		setAlwaysAllowFollowupQuestions,
		setAlwaysAllowUpdateTodoList,
	} = useExtensionState()

	const baseToggles = useAutoApprovalToggles()

	// Include alwaysApproveResubmit in addition to the base toggles.
	const toggles = React.useMemo(
		() => ({
			...baseToggles,
			alwaysApproveResubmit: alwaysApproveResubmit,
		}),
		[baseToggles, alwaysApproveResubmit],
	)

	const onAutoApproveToggle = React.useCallback(
		(key: AutoApproveSetting, value: boolean) => {
			vscode.postMessage({ type: "updateSettings", updatedSettings: { [key]: value } })

			switch (key) {
				case "alwaysAllowReadOnly":
					setAlwaysAllowReadOnly(value)
					break
				case "alwaysAllowWrite":
					setAlwaysAllowWrite(value)
					break
				case "alwaysAllowExecute":
					setAlwaysAllowExecute(value)
					break
				case "alwaysAllowBrowser":
					setAlwaysAllowBrowser(value)
					break
				case "alwaysAllowMcp":
					setAlwaysAllowMcp(value)
					break
				case "alwaysAllowModeSwitch":
					setAlwaysAllowModeSwitch(value)
					break
				case "alwaysAllowSubtasks":
					setAlwaysAllowSubtasks(value)
					break
				case "alwaysApproveResubmit":
					setAlwaysApproveResubmit(value)
					break
				case "alwaysAllowFollowupQuestions":
					setAlwaysAllowFollowupQuestions(value)
					break
				case "alwaysAllowUpdateTodoList":
					setAlwaysAllowUpdateTodoList(value)
					break
			}
		},
		[
			autoApprovalEnabled,
			setAlwaysAllowReadOnly,
			setAlwaysAllowWrite,
			setAlwaysAllowExecute,
			setAlwaysAllowBrowser,
			setAlwaysAllowMcp,
			setAlwaysAllowModeSwitch,
			setAlwaysAllowSubtasks,
			setAlwaysApproveResubmit,
			setAlwaysAllowFollowupQuestions,
			setAlwaysAllowUpdateTodoList,
			setAutoApprovalEnabled,
		],
	)

	const settingsArray = Object.values(autoApproveSettingsConfig)
	const { effectiveAutoApprovalEnabled } = useAutoApprovalState(toggles, autoApprovalEnabled)

	// Calculate enabled and total counts as separate properties
	const enabledCount = React.useMemo(() => {
		return Object.values(toggles).filter((value) => !!value).length
	}, [toggles])

	const totalCount = React.useMemo(() => {
		return Object.keys(toggles).length
	}, [toggles])

	const readModeToggles: AutoApproveSetting[] = [
		"alwaysAllowReadOnly",
		"alwaysAllowUpdateTodoList",
		"alwaysApproveResubmit",
	]
	const monitorModeToggles: AutoApproveSetting[] = [...readModeToggles, "alwaysAllowExecute"]
	const reviewModeToggles: AutoApproveSetting[] = [...monitorModeToggles, "alwaysAllowWrite"]
	const writeModeToggles: AutoApproveSetting[] = [...reviewModeToggles, "alwaysAllowSubtasks"]

	const handleSelectMode = React.useCallback(
		(togglesToEnable: AutoApproveSetting[]) => {
			// Set only the specified toggles to true, others to false (except alwaysAllowMcp and alwaysAllowBrowser)
			Object.keys(autoApproveSettingsConfig).forEach((key) => {
				if (key === "alwaysAllowMcp" || key === "alwaysAllowBrowser") {
					return
				}
				onAutoApproveToggle(key as AutoApproveSetting, togglesToEnable.includes(key as AutoApproveSetting))
			})
		},
		[onAutoApproveToggle],
	)

	const handleSelectNone = React.useCallback(() => {
		// Set all toggles to false (including alwaysAllowMcp and alwaysAllowBrowser)
		Object.keys(autoApproveSettingsConfig).forEach((key) => {
			onAutoApproveToggle(key as AutoApproveSetting, false)
		})
	}, [onAutoApproveToggle])

	const isModeSelected = React.useCallback(
		(togglesToCheck: AutoApproveSetting[]) => {
			return (
				togglesToCheck.every((key) => toggles[key]) &&
				Object.keys(toggles).every((key) => {
					const typedKey = key as AutoApproveSetting
					if (key === "alwaysAllowMcp" || key === "alwaysAllowBrowser") {
						return true // Ignore these two toggles for mode checks
					}
					if (togglesToCheck.includes(typedKey)) {
						return toggles[typedKey]
					}
					return !toggles[typedKey]
				})
			)
		},
		[toggles],
	)

	const isMcpEnabled = React.useMemo(() => toggles.alwaysAllowMcp, [toggles])
	const isBrowserEnabled = React.useMemo(() => toggles.alwaysAllowBrowser, [toggles])
	const isOnlyMcpOrBrowserEnabled = React.useMemo(() => {
		const { alwaysAllowMcp, alwaysAllowBrowser, ...otherToggles } = toggles
		return (alwaysAllowMcp || alwaysAllowBrowser) && Object.values(otherToggles).every((v) => !v)
	}, [toggles])

	const modeColor = React.useMemo(() => {
		if (!autoApprovalEnabled) {
			return "text-vscode-foreground"
		} else if (
			isModeSelected(writeModeToggles) ||
			isModeSelected(monitorModeToggles) ||
			isModeSelected(readModeToggles) ||
			isModeSelected(reviewModeToggles)
		) {
			return "text-[var(--vscode-icon-foreground)]"
		} else if (enabledCount === totalCount) {
			return "text-[var(--vscode-activityWarningBadge-background)]" // All mode color
		} else if (enabledCount > 0) {
			return "text-[var(--vscode-textLink-foreground)]" // Custom mode color
		}
		return "text-vscode-errorForeground"
	}, [toggles, enabledCount, totalCount, autoApprovalEnabled])

	const modeText = React.useMemo(() => {
		var mode = ""

		if (!autoApprovalEnabled) {
			return t("chat:autoApprove.triggerLabelOff")
		}

		if (isModeSelected(writeModeToggles)) {
			mode = "Pretzeled"
		} else if (isModeSelected(reviewModeToggles)) {
			mode = "Review"
		} else if (isModeSelected(monitorModeToggles)) {
			mode = "Monitor"
		} else if (isModeSelected(readModeToggles)) {
			mode = "Read"
		} else if (enabledCount > 0 && !isOnlyMcpOrBrowserEnabled) {
			mode = "Custom"
		} else if (enabledCount === totalCount) {
			mode = t("chat:autoApprove.triggerLabelAll")
		} else if (enabledCount === 0) {
			mode = "None"
		}

		if ((isMcpEnabled || isBrowserEnabled) && !isOnlyMcpOrBrowserEnabled) {
			mode += " + "
		}

		if (isMcpEnabled && isBrowserEnabled) {
			mode += "MCP & Browser"
		} else if (isMcpEnabled) {
			mode += "MCP"
		} else if (isBrowserEnabled) {
			mode += "Browser"
		}

		return mode
	}, [toggles, enabledCount, totalCount, autoApprovalEnabled])

	const modeIcon = React.useMemo(() => {
		const lucideClass = cn("size-3 flex-shrink-0")

		if (!autoApprovalEnabled) {
			return <X className={lucideClass} />
		}

		if (isModeSelected(writeModeToggles)) {
			return "🥨"
		} else if (isModeSelected(reviewModeToggles)) {
			return <MessageSquareCode className={lucideClass} />
		} else if (isModeSelected(monitorModeToggles)) {
			return <FileDiff className={lucideClass} />
		} else if (isModeSelected(readModeToggles)) {
			return <BookOpenText className={lucideClass} />
		} else if (enabledCount === totalCount) {
			return <LayoutList className={lucideClass} />
		} else if (isOnlyMcpOrBrowserEnabled && isBrowserEnabled && !isMcpEnabled) {
			return <Globe className={lucideClass} />
		} else if (isOnlyMcpOrBrowserEnabled && isMcpEnabled && !isBrowserEnabled) {
			return <Server className={lucideClass} />
		} else if (enabledCount > 0) {
			return <ListTodo className={lucideClass} />
		} else {
			return <LayoutList className={lucideClass} />
		}
	}, [toggles, enabledCount, totalCount, autoApprovalEnabled])

	const handleOpenSettings = React.useCallback(
		() =>
			window.postMessage({ type: "action", action: "settingsButtonClicked", values: { section: "autoApprove" } }),
		[],
	)

	// Handle the main auto-approval toggle
	const handleAutoApprovalToggle = React.useCallback(() => {
		const newValue = !(autoApprovalEnabled ?? false)
		setAutoApprovalEnabled(newValue)
		vscode.postMessage({ type: "autoApprovalEnabled", bool: newValue })
	}, [autoApprovalEnabled, setAutoApprovalEnabled])

	const tooltipText =
		!effectiveAutoApprovalEnabled || enabledCount === 0
			? t("chat:autoApprove.tooltipManage")
			: t("chat:autoApprove.tooltipStatus", {
					toggles: settingsArray
						.filter((setting) => toggles[setting.key])
						.map((setting) => t(setting.labelKey))
						.join(", "),
				})

	return (
		<Popover open={open} onOpenChange={setOpen} data-testid="auto-approve-dropdown-root">
			<StandardTooltip content={tooltipText}>
				<PopoverTrigger
					disabled={disabled}
					data-testid="auto-approve-dropdown-trigger"
					className={cn(
						"inline-flex gap-1.5 relative whitespace-nowrap px-1.5 py-1 text-xs",
						"bg-transparent border border-[rgba(255,255,255,0.08)] rounded-md text-vscode-foreground",
						"transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-vscode-focusBorder focus-visible:ring-inset",
						"max-[300px]:shrink-0",
						disabled
							? "opacity-50 cursor-not-allowed"
							: "opacity-90 hover:opacity-100 hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.15)] cursor-pointer",
						triggerClassName,
					)}>
					<div className={`truncate min-w-0 flex flex-row gap-1 ${modeColor}`}>
						{modeIcon}
						<span>{modeText}</span>
					</div>
				</PopoverTrigger>
			</StandardTooltip>
			<PopoverContent
				align="start"
				sideOffset={4}
				container={portalContainer}
				className="p-0 overflow-hidden w-[min(440px,calc(100vw-2rem))]"
				onOpenAutoFocus={(e) => e.preventDefault()}>
				<div className="flex flex-col w-full">
					{/* Header with description */}
					<div className="p-3 border-b border-vscode-dropdown-border">
						<div className="flex items-center justify-between gap-1 pr-1 pb-2">
							<h4 className="m-0 font-bold text-base text-vscode-foreground">
								{t("chat:autoApprove.title")}
							</h4>
							<Settings
								className="inline mb-0.5 mr-1 size-4 cursor-pointer"
								onClick={handleOpenSettings}
							/>
						</div>
						<p className="m-0 text-xs text-vscode-descriptionForeground">
							{t("chat:autoApprove.description")}
						</p>
					</div>
					<div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-x-2 gap-y-2 p-3">
						{settingsArray.map(({ key, labelKey, descriptionKey, icon }) => {
							const isEnabled = toggles[key]
							return (
								<StandardTooltip key={key} content={t(descriptionKey)}>
									<Button
										variant={isEnabled ? "primary" : "secondary"}
										onClick={() => onAutoApproveToggle(key, !isEnabled)}
										className={cn(
											"flex items-center gap-2 px-2 py-2 text-sm text-left justify-start h-auto",
											"transition-all duration-150",
											"opacity-100 hover:opacity-70",
											"cursor-pointer",
											isEnabled
												? "bg-vscode-button-background text-vscode-button-foreground"
												: "bg-vscode-button-background/15 text-vscode-foreground hover:bg-vscode-list-hoverBackground",
										)}
										data-testid={`auto-approve-${key}`}>
										<span className={`codicon codicon-${icon} text-sm flex-shrink-0`} />
										<span className="flex-1 truncate">{t(labelKey)}</span>
									</Button>
								</StandardTooltip>
							)
						})}
					</div>

					{/* Bottom bar with toggle / toolkit buttons */}
					<div className="flex flex-row items-center justify-between px-2 py-2 border-t border-vscode-dropdown-border">
						<label
							className="flex items-center gap-2 pr-2 cursor-pointer"
							onClick={(e) => {
								// Prevent label click when clicking on the toggle switch itself
								if ((e.target as HTMLElement).closest('[role="switch"]')) {
									e.preventDefault()
									return
								}
								handleAutoApprovalToggle()
							}}>
							<ToggleSwitch
								checked={effectiveAutoApprovalEnabled}
								aria-label="Toggle auto-approval"
								onChange={handleAutoApprovalToggle}
							/>
							<span className={cn("text-sm font-bold select-none")}>Enabled</span>
						</label>

						<div className="flex flex-row gap-1">
							<button
								aria-label="Write Mode"
								onClick={() => handleSelectMode(writeModeToggles)}
								className={cn(
									"relative inline-flex items-center justify-center gap-1",
									"bg-transparent border-none px-2 py-1",
									"rounded-md text-base font-bold",
									"text-vscode-foreground",
									"transition-all duration-150",
									"hover:opacity-100 hover:bg-[rgba(255,255,255,0.03)]",
								)}>
								<span className="text-xl">🥨</span>
							</button>
							<button
								aria-label="Review Mode"
								onClick={() => handleSelectMode(reviewModeToggles)}
								className={cn(
									"relative inline-flex items-center justify-center gap-1",
									"bg-transparent border-none px-2 py-1",
									"rounded-md text-base font-bold",
									"text-vscode-foreground",
									"transition-all duration-150",
									"hover:opacity-100 hover:bg-[rgba(255,255,255,0.03)]",
								)}>
								<MessageSquareCode className="w-3.5 h-3.5" />
							</button>
							<button
								aria-label="Monitor Mode"
								onClick={() => handleSelectMode(monitorModeToggles)}
								className={cn(
									"relative inline-flex items-center justify-center gap-1",
									"bg-transparent border-none px-2 py-1",
									"rounded-md text-base font-bold",
									"text-vscode-foreground",
									"transition-all duration-150",
									"hover:opacity-100 hover:bg-[rgba(255,255,255,0.03)]",
								)}>
								<FileDiff className="w-3.5 h-3.5" />
							</button>
							<button
								aria-label="Read Only Mode"
								onClick={() => handleSelectMode(readModeToggles)}
								className={cn(
									"relative inline-flex items-center justify-center gap-1",
									"bg-transparent border-none px-2 py-1",
									"rounded-md text-base font-bold",
									"text-vscode-foreground",
									"transition-all duration-150",
									"hover:opacity-100 hover:bg-[rgba(255,255,255,0.03)]",
								)}>
								<BookOpenText className="w-3.5 h-3.5" />
							</button>
							<button
								aria-label="Select None"
								onClick={handleSelectNone}
								className={cn(
									"relative inline-flex items-center justify-center gap-1",
									"bg-transparent border-none px-2 py-1",
									"rounded-md text-base font-bold",
									"text-vscode-foreground",
									"transition-all duration-150",
									"hover:opacity-100 hover:bg-[rgba(255,255,255,0.03)]",
								)}>
								<LayoutList className="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}
