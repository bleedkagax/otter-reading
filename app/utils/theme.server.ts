import * as cookie from 'cookie'

const cookieName = 'en_theme'
export type Theme = 'light' | 'dark' | 'solarized-light' | 'minimal'

export function getTheme(request: Request): Theme | null {
	const cookieHeader = request.headers.get('cookie')
	const parsed = cookieHeader ? cookie.parse(cookieHeader)[cookieName] : 'light'
	if (parsed === 'light' || parsed === 'dark' || parsed === 'solarized-light' || parsed === 'minimal') return parsed as Theme
	return null
}

export function setTheme(theme: Theme | 'system') {
	if (theme === 'system') {
		return cookie.serialize(cookieName, '', { path: '/', maxAge: -1 })
	} else {
		return cookie.serialize(cookieName, theme, { path: '/', maxAge: 31536000 })
	}
}
