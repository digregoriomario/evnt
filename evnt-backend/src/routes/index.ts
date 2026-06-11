import { Router } from "express";
import { authRouter } from "./auth.routes";
import { eventsRouter } from "./events.routes";
import { catalogRouter } from "./catalog.routes";
import { chatsRouter } from "./chats.routes";
import { meRouter } from "./me.routes";
import { notificationsRouter } from "./notifications.routes";
import { usersRouter } from "./users.routes";
import { checkDatabaseHealth } from "../utils/database";
import { asyncHandler } from "../utils/http";

export const apiRouter = Router();

apiRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const database = await checkDatabaseHealth();
    const payload = {
      status: database.ok ? "ok" : "error",
      database,
      timestamp: new Date().toISOString()
    };
    res.status(database.ok ? 200 : 503).json(payload);
  })
);
apiRouter.use("/auth", authRouter);
apiRouter.use("/events", eventsRouter);
apiRouter.use("/catalog", catalogRouter);
apiRouter.use("/chats", chatsRouter);
apiRouter.use("/me", meRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/users", usersRouter);
