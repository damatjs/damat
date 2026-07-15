export function globToRegExp(glob: string): RegExp {
  let output = "^";
  for (let index = 0; index < glob.length; index++) {
    const character = glob[index]!;
    if (character === "*") {
      if (glob[index + 1] === "*") {
        output += ".*";
        index++;
        if (glob[index + 1] === "/") index++;
      } else output += "[^/]*";
    } else if (character === "?") output += "[^/]";
    else output += character.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(output + "$");
}

export function staticPrefix(glob: string): string {
  const wildcard = glob.search(/[*?]/);
  const literal = wildcard === -1 ? glob : glob.slice(0, wildcard);
  const slash = literal.lastIndexOf("/");
  return slash === -1 ? "" : literal.slice(0, slash + 1);
}
