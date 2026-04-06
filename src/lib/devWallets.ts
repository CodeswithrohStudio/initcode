export function getInitUsername(address: string): string {
  const names = ["dev", "builder", "coder", "hacker", "maker"];
  const charSum = address.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const name = names[charSum % names.length];
  const suffix = address.slice(-6);
  return `${name}${suffix}.init`;
}
