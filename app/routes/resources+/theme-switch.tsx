import { useForm, getFormProps } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { data, redirect, useFetcher, useFetchers } from 'react-router'
import { ServerOnly } from 'remix-utils/server-only'
import { z } from 'zod'
import { Icon } from '#app/components/ui/icon.tsx'
import { useHints, useOptionalHints } from '#app/utils/client-hints.tsx'
import {
	useOptionalRequestInfo,
	useRequestInfo,
} from '#app/utils/request-info.ts'
import { type Theme, setTheme } from '#app/utils/theme.server.ts'
import { type Route } from './+types/theme-switch.ts'
const ThemeFormSchema = z.object({
	theme: z.enum(['system', 'light', 'dark', 'solarized-light', 'minimal']),
	// this is useful for progressive enhancement
	redirectTo: z.string().optional(),
})

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: ThemeFormSchema,
	})

	invariantResponse(submission.status === 'success', 'Invalid theme received')

	const { theme, redirectTo } = submission.value

	const responseInit = {
		headers: { 'set-cookie': setTheme(theme) },
	}
	if (redirectTo) {
		return redirect(redirectTo, responseInit)
	} else {
		return data({ result: submission.reply() }, responseInit)
	}
}

export function ThemeSwitch({
	userPreference,
}: {
	userPreference?: Theme | null
}) {
	const fetcher = useFetcher<typeof action>()
	const requestInfo = useRequestInfo()

	const [form] = useForm({
		id: 'theme-switch',
		lastResult: fetcher.data?.result,
	})

	const optimisticMode = useOptimisticThemeMode()
	const mode = optimisticMode ?? userPreference ?? 'system'
	
	// Define the theme cycle order
	const getNextTheme = (currentTheme: string) => {
		const themeOrder = ['system', 'light', 'dark', 'solarized-light', 'minimal'];
		const currentIndex = themeOrder.indexOf(currentTheme);
		const nextIndex = (currentIndex + 1) % themeOrder.length;
		return themeOrder[nextIndex];
	};
	
	const nextMode = getNextTheme(mode);
	
	// Theme display names
	const themeNames = {
		'system': 'System',
		'light': 'Light',
		'dark': 'Dark',
		'solarized-light': 'Solarized Light',
		'minimal': 'Minimal'
	};
	
	const modeLabel = {
		light: (
			<Icon name="sun">
				<span className="sr-only">Light</span>
			</Icon>
		),
		dark: (
			<Icon name="moon">
				<span className="sr-only">Dark</span>
			</Icon>
		),
		system: (
			<Icon name="laptop">
				<span className="sr-only">System</span>
			</Icon>
		),
		'solarized-light': (
			<Icon name="palette">
				<span className="sr-only">Solarized Light</span>
			</Icon>
		),
		'minimal': (
			<Icon name="layout">
				<span className="sr-only">Minimal</span>
			</Icon>
		),
	}

	return (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action="/resources/theme-switch"
		>
			<ServerOnly>
				{() => (
					<input type="hidden" name="redirectTo" value={requestInfo.path} />
				)}
			</ServerOnly>
			<input type="hidden" name="theme" value={nextMode} />
			<div className="flex items-center gap-2">
				<button
					type="submit"
					className="group flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted"
					title={`Current theme: ${themeNames[mode]}, click to switch to ${themeNames[nextMode]}`}
				>
					<span className="flex h-8 w-8 items-center justify-center">
						{modeLabel[mode]}
					</span>
					<span className="text-sm hidden sm:inline-block">{themeNames[mode]}</span>
				</button>
			</div>
		</fetcher.Form>
	)
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
	const fetchers = useFetchers()
	const themeFetcher = fetchers.find(
		(f) => f.formAction === '/resources/theme-switch',
	)

	if (themeFetcher && themeFetcher.formData) {
		const submission = parseWithZod(themeFetcher.formData, {
			schema: ThemeFormSchema,
		})

		if (submission.status === 'success') {
			return submission.value.theme
		}
	}
}

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
	const hints = useHints()
	const requestInfo = useRequestInfo()
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system' ? hints.theme : optimisticMode
	}
	return requestInfo.userPrefs.theme ?? hints.theme
}

export function useOptionalTheme() {
	const optionalHints = useOptionalHints()
	const optionalRequestInfo = useOptionalRequestInfo()
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system' ? optionalHints?.theme : optimisticMode
	}
	return optionalRequestInfo?.userPrefs.theme ?? optionalHints?.theme
}
