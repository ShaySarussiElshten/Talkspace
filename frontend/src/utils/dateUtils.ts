
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Expired';
  }
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  
  if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  }
  
  return `${diffSecs} second${diffSecs > 1 ? 's' : ''}`;
}


export function formatCountdown(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  

  if (diffMs <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  const seconds = Math.floor((diffMs % (60 * 1000)) / 1000);
  
  return `${minutes}m ${seconds}s`;
}
