import { defineRailway, project, service, postgres } from "@railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");

  const api = service("glyph-api", {
    env: {
      PORT: "8083",
      DATABASE_URL: db.env.DATABASE_URL,
      RAILWAY_DOCKERFILE_PATH: "server/Dockerfile",
      CLERK_PUBLISHABLE_KEY: "",
      CLERK_SECRET_KEY: "",
      GEMINI_API_KEY: "",
      FRONTEND_URL: "${{glyph-frontend.RAILWAY_PUBLIC_DOMAIN}}",
    },
  });

  const worker = service("glyph-worker", {
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      NODE_ENV: "production",
      RAILWAY_DOCKERFILE_PATH: "server/Dockerfile.worker",
    },
  });

  const frontend = service("glyph-frontend", {
    env: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "${{glyph-api.CLERK_PUBLISHABLE_KEY}}",
      CLERK_SECRET_KEY: "${{glyph-api.CLERK_SECRET_KEY}}",
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: "/dashboard",
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: "/dashboard",
      NEXT_PUBLIC_API_URL: "https://${{glyph-api.RAILWAY_PUBLIC_DOMAIN}}",
      RAILWAY_DOCKERFILE_PATH: "frontend/Dockerfile",
    },
  });

  return project("glyph", {
    resources: [db, api, worker, frontend],
  });
});
