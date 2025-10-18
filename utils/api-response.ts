export class ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;

  constructor(success: boolean, statusCode: number, message?: string, data?: T) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  // Success response
  static successData<T>(data?: T, message: string = 'Success', statusCode: number = 200) {
    return new ApiResponse<T>(true, statusCode, message, data);
  }
    static success<T>(message: string = 'Success', statusCode: number = 200) {
    return new ApiResponse<T>(true, statusCode, message);
  }

  // Error response
  static error<T>(message: string = 'Error', data?: T, statusCode: number = 400) {
    return new ApiResponse<T>(false, statusCode, message, data);
  }
}
