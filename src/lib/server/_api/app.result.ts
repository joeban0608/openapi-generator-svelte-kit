export abstract class AppError extends Error {
	abstract readonly type: string;
	abstract readonly code: number;

	constructor(message: string) {
		super(message);
	}

	public serialize() {
		return { type: this.type, code: this.code, message: this.message };
	}
}

type Result<T, E extends AppError> =
	| {
			success: true;
			value: T;
	  }
	| {
			success: false;
			error: E;
	  };

export const ok = <T, E extends AppError>(value: T): Result<T, E> => ({ success: true, value });
export const err = <T, E extends AppError>(error: E): Result<T, E> => ({ success: false, error });
export type AppResult<T> = Result<T, AppError>;
