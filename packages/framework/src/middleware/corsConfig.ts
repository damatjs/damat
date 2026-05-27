type allowedMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS"

export interface CorsConfigType {
  origin: string | string[],
  allowMethods: allowedMethod[],
  allowHeaders: string[],
  exposeHeaders: string[],
  credentials: boolean,
  maxAge: number,
}


export function corsConfigSetter(config?: string | CorsConfigType): CorsConfigType {
  if (typeof (config) === "string" || !config)
    return {
      origin: !config || config === "*" ? "*" : config.split(","),
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],
      exposeHeaders: ["X-Request-ID", "X-Response-Time", "Retry-After"],
      credentials: true,
      maxAge: 86400,
    };
  else {
    return config;
  }
}
