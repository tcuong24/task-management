import { Router } from "express";
import { getPublicPlatformSettingsHandler } from "./platform.controller";

const router = Router();

router.get(
  "/settings",
  getPublicPlatformSettingsHandler,
);

export default router;