import { sequence } from '@sveltejs/kit/hooks';
import * as auth from '$lib/server/auth';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '$lib/server/db';
import path from 'path';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

function _init(): ServerInit {
	return async () => {
		try {
			await migrate(db, { migrationsFolder: path.resolve('.') + '/migrations' });
		} catch (error) {
			console.error('Migration failed:', error);
			process.exit(1);
		}
	};
}

function error(): HandleServerError {
	return async ({ error, event, status, message }) => {
		console.error('Error occurred:', error, event, status, message);

		return {
			status: 'error',
			code: status,
			message
		};
	};
}

export const handle: Handle = sequence(handleParaglide, handleAuth);
export const init: ServerInit = _init();
export const handleError: HandleServerError = error();
