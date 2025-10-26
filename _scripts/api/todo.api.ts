import { z } from 'zod';
export const todoSchema = {
	// post
	'GET /api/v1/todos': {
		tooling: false,
		name: 'Get Todos',
		description: 'Retrieve a list of todos.',
		tags: ['Todo'],
		request: z.object({}),
		response: z.array(
			z.object({
				id: z.string(),
				title: z.string(),
				completed: z.boolean()
			})
		)
	},

	'POST /api/v1/todos': {
		tooling: false,
		name: 'Create Todo',
		description: 'Create a new todo item.',
		tags: ['Todo'],
		request: z.object({
			title: z.string().min(1, 'Title is required')
		}),
		response: z.object({
			message: z.string().default('Todo created successfully')
		})
	},

	'GET /api/v1/todos/:todoId': {
		tooling: false,
		name: 'Get Todo',
		description: 'Retrieve a specific todo item by ID.',
		tags: ['Todo'],
		request: z.object({
			todoId: z.string()
		}),
		response: z.object({
			id: z.string(),
			title: z.string(),
			completed: z.boolean()
		})
	},

	'PATCH /api/v1/todos/:todoId': {
		tooling: false,
		name: 'Update Todo',
		description: 'Update an existing todo item.',
		tags: ['Todo'],
		request: z.object({
			todoId: z.string(),
			title: z.string().optional(),
			completed: z.boolean().optional()
		}),
		response: z.object({
			message: z.string().default('Todo updated successfully')
		})
	},

	'DELETE /api/v1/todos/:todoId': {
		tooling: false,
		name: 'Delete Todo',
		description: 'Delete a specific todo item by ID.',
		tags: ['Todo'],
		request: z.object({
			todoId: z.string()
		}),
		response: z.object({
			message: z.string().default('Todo deleted successfully')
		})
	}
};
