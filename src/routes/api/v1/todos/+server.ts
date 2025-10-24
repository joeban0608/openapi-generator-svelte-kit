import { ServerHandler } from '$lib/server';
import { createTodo, getTodos } from '$lib/server/todo-crud';
import type { RequestHandler } from './$types';
import { AppError, err, ok } from '$lib/server/_api/app.result';

export const GET: RequestHandler = async (event) =>
	ServerHandler.API(
		'GET /api/v1/todos',
		event,
		async () => {
			try {
				const result = await getTodos();
				return await ok(result);
			} catch (e) {
				if (e instanceof AppError) return await err(e);
				throw e;
			}
		},
		{ skipAuth: true }
	);

export const POST: RequestHandler = async (event) =>
	ServerHandler.API(
		'POST /api/v1/todos',
		event,
		async ({ requestBody }) => {
			try {
				const { title } = requestBody;
				if (!title) {
					throw new TodoTitleRequiredError();
				}
				await createTodo(title);
				return await ok({ message: 'Todo created successfully' });
			} catch (e) {
				if (e instanceof AppError) return await err(e);
				throw e;
			}
		},
		{ skipAuth: true }
	);

class TodoTitleRequiredError extends AppError {
	type: string = 'TODO_TITLE_REQUIRED';
	code: number = 400; // Bad Request

	constructor() {
		super('Todo title is required');
	}
}
