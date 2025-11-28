export function formatTimestamp(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  const minutes = Math.floor(diff / 60);
  const hours = Math.floor(diff / 3600);
  const days = Math.floor(diff / 86400);
  const weeks = Math.floor(days / 7);

  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();

  if (diff < 60) return 'Updated just now';
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} day${days === 1 ? '' : 's'} ago`;
  if (weeks === 1) return 'Updated last week';
  if (weeks < 4) return `Updated ${weeks} week${weeks === 1 ? '' : 's'} ago`;

  if (year === now.getFullYear()) {
    return `Updated ${day} ${month}`;
  } else {
    return `Updated ${day} ${month}, ${year}`;
  }
}