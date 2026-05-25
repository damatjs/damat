
export function toCamelCase(name: string): string {
    if (!name) return name;
    return name.charAt(0).toLowerCase() + name.slice(1);
}

