import { z } from 'zod'

const schema = z.object({
	NODE_ENV: z.enum(['production', 'development', 'test'] as const),
	DATABASE_PATH: z.string(),
	DATABASE_URL: z.string(),
	SESSION_SECRET: z.string(),
	INTERNAL_COMMAND_TOKEN: z.string(),
	HONEYPOT_SECRET: z.string(),
	CACHE_DATABASE_PATH: z.string(),
	// If you plan on using Sentry, remove the .optional()
	SENTRY_DSN: z.string().optional(),
	// If you plan to use Resend, remove the .optional()
	RESEND_API_KEY: z.string().optional(),
	// If you plan to use GitHub auth, remove the .optional()
	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),
	GITHUB_REDIRECT_URI: z.string().optional(),
	GITHUB_TOKEN: z.string().optional(),

	ALLOW_INDEXING: z.enum(['true', 'false']).optional(),

	// Tigris Object Storage Configuration
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	AWS_REGION: z.string(),
	AWS_ENDPOINT_URL_S3: z.string().url(),
	BUCKET_NAME: z.string(),

	// Gemini API Configuration
	GEMINI_API_KEY: z.string().optional(),

	// 添加调试信息
	_DEBUG_GEMINI_API_KEY: z.string().optional(),
})

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof schema> {}
	}
}

export function init() {
	// 添加调试信息
	console.log('Initializing environment variables...');
	console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

	// 将GEMINI_API_KEY复制到调试变量中
	process.env._DEBUG_GEMINI_API_KEY = process.env.GEMINI_API_KEY ? 'exists' : 'not-exists';

	const parsed = schema.safeParse(process.env)

	if (parsed.success === false) {
		console.error(
			'❌ Invalid environment variables:',
			parsed.error.flatten().fieldErrors,
		)

		throw new Error('Invalid environment variables')
	}

	// 添加更多调试信息
	console.log('Environment variables initialized successfully');
	console.log('GEMINI_API_KEY after initialization:', !!process.env.GEMINI_API_KEY);
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getEnv() {
	return {
		MODE: process.env.NODE_ENV,
		SENTRY_DSN: process.env.SENTRY_DSN,
		ALLOW_INDEXING: process.env.ALLOW_INDEXING,
		_DEBUG_GEMINI_API_KEY: process.env._DEBUG_GEMINI_API_KEY,
	}
}

type ENV = ReturnType<typeof getEnv>

declare global {
	var ENV: ENV
	interface Window {
		ENV: ENV
	}
}
