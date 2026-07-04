export enum Permissions {
  NONE = 0,
  READ = 1 << 0,         // 1
  WRITE_SELF = 1 << 1,   // 2
  APPROVE = 1 << 2,      // 4
  ADMIN = 1 << 3,        // 8
  PAYROLL = 1 << 4       // 16
}

export function hasPermission(userMask: number, requiredMask: number): boolean {
  return (userMask & requiredMask) === requiredMask;
}
