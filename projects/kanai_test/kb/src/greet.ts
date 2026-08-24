export function greet(name: string): string {
  // saludo con validacion basica
  const n = name.trim() || 'mundo'
  return 'hola ' + n
}
