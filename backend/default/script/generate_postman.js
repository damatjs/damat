import fs from "fs";
import path from "path";

// Recursively find all route.ts files
function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findRouteFiles(filePath, fileList);
    } else if (file === "route.ts") {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const baseDir = path.join(process.cwd(), "src/api/routes");
const routeFiles = findRouteFiles(baseDir);

const collection = {
  info: {
    name: "Damatjs API",
    description: "Postman Collection for the Damatjs API",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  item: [],
};

function convertPathToPostmanPath(filePath) {
  // src/api/routes/v1/sections/[id]/route.ts -> /v1/sections/:id
  let relativePath = path.relative(baseDir, filePath);
  relativePath = relativePath
    .replace("/route.ts", "")
    .replace("\\route.ts", "");

  // Replace [param] with :param
  relativePath = relativePath.replace(/\[([^\]]+)\]/g, ":$1");

  return `/api/${relativePath}`;
}

const folders = {};

routeFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf-8");
  const postmanPath = convertPathToPostmanPath(file);

  // Find all exported methods
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  const availableMethods = methods.filter((method) =>
    content.includes(`export async function ${method}`),
  );

  if (availableMethods.length === 0) return;

  // Extract a very basic payload guess for POST/PATCH/PUT
  let basicBody = {};
  if (content.includes("z.object({")) {
    // Very rudimentary extraction
    const match = content.match(
      /const \w+Schema = z\.object\(\{([\s\S]*?)\}\);/,
    );
    if (match) {
      const fields = match[1].split("\n");
      fields.forEach((field) => {
        const fieldMatch = field.match(
          /^\s*(\w+): z\.(string|number|boolean|array|object)/,
        );
        if (fieldMatch) {
          const [, name, type] = fieldMatch;
          if (type === "string") basicBody[name] = "string";
          if (type === "number") basicBody[name] = 0;
          if (type === "boolean") basicBody[name] = false;
          if (type === "array") basicBody[name] = [];
          if (type === "object") basicBody[name] = {};
        }
      });
    }
  }

  // Group by first path segment after api/v1
  const parts = postmanPath.split("/").filter(Boolean);
  const v1Index = parts.indexOf("v1");
  const group = parts.length > v1Index + 1 ? parts[v1Index + 1] : "other";

  if (!folders[group]) {
    folders[group] = {
      name: group.charAt(0).toUpperCase() + group.slice(1),
      item: [],
    };
    collection.item.push(folders[group]);
  }

  availableMethods.forEach((method) => {
    const request = {
      name: `${method} ${postmanPath}`,
      request: {
        method: method,
        header: [
          {
            key: "Authorization",
            value: "Bearer {{api_key}}",
            type: "text",
          },
        ],
        url: {
          raw: `{{base_url}}${postmanPath}`,
          host: ["{{base_url}}"],
          path: postmanPath.split("/").filter(Boolean),
          variable: parts
            .filter((p) => p.startsWith(":"))
            .map((p) => ({
              key: p.substring(1),
              value: `sample_${p.substring(1)}`,
            })),
        },
      },
      response: [],
    };

    if (
      ["POST", "PUT", "PATCH"].includes(method) &&
      Object.keys(basicBody).length > 0
    ) {
      request.request.body = {
        mode: "raw",
        raw: JSON.stringify(basicBody, null, 2),
        options: {
          raw: {
            language: "json",
          },
        },
      };
    }

    folders[group].item.push(request);
  });
});

fs.writeFileSync(
  "postman_collection.json",
  JSON.stringify(collection, null, 2),
);
console.log("Postman collection generated at postman_collection.json");
