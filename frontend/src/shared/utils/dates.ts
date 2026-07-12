import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export const formatDate = (date: Date | string | number, formatStr: string = "MMM d, yyyy") => {
  return format(new Date(date), formatStr);
};

export const formatDateTime = (date: Date | string | number) => {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
};

export const formatRelativeTime = (date: Date | string | number) => {
  const d = new Date(date);
  if (isToday(d)) {
    return "Today at " + format(d, "h:mm a");
  }
  if (isYesterday(d)) {
    return "Yesterday at " + format(d, "h:mm a");
  }
  return formatDistanceToNow(d, { addSuffix: true });
};
