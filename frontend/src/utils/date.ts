const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "medium",
  timeStyle: "short",
});

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(
  value: string,
  fallback = "Data indisponível"
) {
  if (!value) {
    return fallback;
  }

  const date = parseDate(value);
  return date ? dateTimeFormatter.format(date) : fallback;
}

export function formatDate(value: string, fallback = "Por definir") {
  if (!value) {
    return fallback;
  }

  const date = parseDate(value);
  return date ? dateFormatter.format(date) : fallback;
}
