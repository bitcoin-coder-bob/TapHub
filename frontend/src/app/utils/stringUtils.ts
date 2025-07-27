export function truncateUsername(username: string, maxLength: number = 20): string {
  if (!username || username.length <= maxLength) {
    return username;
  }
  
  return username.slice(0, maxLength - 3) + '...';
}