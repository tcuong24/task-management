export class AppError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
