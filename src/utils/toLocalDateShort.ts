export default function toLocalDateShort(date: string | number | Date): string {
  return new Date(date).toLocaleDateString("fa-IR");
}
