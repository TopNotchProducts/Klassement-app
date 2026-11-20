/** "1 team", "3 teams" */
export function aantal(n: number, enkelvoud: string, meervoud: string): string {
  return `${n} ${n === 1 ? enkelvoud : meervoud}`;
}
