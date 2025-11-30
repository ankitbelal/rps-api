export class ApiResponse<T extends object> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;

  constructor(
    success: boolean,
    statusCode: number,
    message?: string,
    data?: T,
  ) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static successData<T extends object>(
    data?: T,
    message: string = 'Success',
    statusCode: number = 200,
  ) {
    if (data) {
      return { success: true, statusCode, message, ...data };
    }
    return { success: true, statusCode, message };
  }

  static success<T>(message: string = 'Success', statusCode: number = 200) {
    return { success: true, statusCode, message };
  }

  static error<T>(
    message: string = 'Error',
    data?: T,
    statusCode: number = 400,
  ) {
    if (data) {
      return { success: false, statusCode, message, ...data };
    }
    return { success: false, statusCode, message };
  }
}
