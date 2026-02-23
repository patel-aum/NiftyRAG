/**
 * Load .env.local then .env so tests can run with same env as dev.
 * Required for: OPENAI_API_KEY (embeddings), GOOGLE_GENERATIVE_AI_API_KEY (model).
 */
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();
