import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 환경변수(키·주소)는 lib/env/* 에서만 읽는다. NODE_ENV는 비밀이 아니므로 허용.
  // prisma 설정·시드는 Next 밖에서 dotenv로 도는 스크립트라 예외.
  {
    ignores: ["lib/env/**", "prisma/**", "prisma.config.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.object.name='process'][object.property.name='env'][property.name!='NODE_ENV']",
          message: "환경변수는 lib/env/public.ts(공개값) 또는 lib/env/server.ts(비밀값)에서만 읽으세요.",
        },
        {
          selector: "VariableDeclarator[init.object.name='process'][init.property.name='env']",
          message: "환경변수는 lib/env/public.ts(공개값) 또는 lib/env/server.ts(비밀값)에서만 읽으세요.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
