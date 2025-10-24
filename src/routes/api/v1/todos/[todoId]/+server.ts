import { ServerHandler } from '$lib/server';
import { AppError, err, ok } from '$lib/server/_api/app.result';
import { deleteTodo, getTodo, updateTodo } from '$lib/server/todo-crud';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) =>
	ServerHandler.API(
		'GET /api/v1/todos/:todoId',
		event,
		async ({ requestBody }) => {
			const { todoId } = requestBody;
			try {
				const [todo] = await getTodo(todoId);
				// Ensure result is a single todo object, not an array
				if (!todo) {
					return await err(new TodoNotFoundError());
				}
				return await ok(todo);
			} catch (e) {
				if (e instanceof AppError) return await err(e);
				throw e;
			}
		},
		{ skipAuth: true }
	);

export const PATCH: RequestHandler = async (event) =>
	ServerHandler.API(
		'PATCH /api/v1/todos/:todoId',
		event,
		async ({ requestBody }) => {
			const { todoId, title, completed } = requestBody;
			try {
				if (!todoId) {
					throw new TodoNotFoundError();
				}

				await updateTodo({
					id: todoId,
					title,
					completed: !!completed
				});

				return await ok({ message: 'Todo updated successfully' });
			} catch (e) {
				if (e instanceof AppError) return await err(e);
				throw e;
			}
		},
		{ skipAuth: true }
	);


export const DELETE: RequestHandler = async (event) => ServerHandler.API(
	'DELETE /api/v1/todos/:todoId',
	event,
	async ({ requestBody }) => {
		const { todoId } = requestBody;
		try {
			if (!todoId) {
				throw new TodoNotFoundError();
			}

			await deleteTodo(todoId);

			return await ok({ message: 'Todo deleted successfully' });
		} catch (e) {
			if (e instanceof AppError) return await err(e);
			throw e;
		}
	},
	{ skipAuth: true }
);

class TodoNotFoundError extends AppError {
	type: string = 'TODO_NOT_FOUND';
	code: number = 404; // Not Found

	constructor() {
		super('Todo not found');
	}
}
