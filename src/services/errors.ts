export class ConcurrencyConflictError extends Error {
  constructor(
    message = 'Dữ liệu này vừa được đồng nghiệp cập nhật trên hệ thống. Ứng dụng đã tự động làm mới với dữ liệu mới nhất.'
  ) {
    super(message);
    this.name = 'ConcurrencyConflictError';
  }
}
