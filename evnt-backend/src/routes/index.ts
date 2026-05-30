import { Router } from "express";
import { authRouter } from "./auth.routes";
import { eventsRouter } from "./events.routes";
import { catalogRouter } from "./catalog.routes";
import { meRouter } from "./me.routes";
import { notificationsRouter } from "./notifications.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => res.json({ status: "ok" }));
apiRouter.use("/auth", authRouter);
apiRouter.use("/events", eventsRouter);
apiRouter.use("/catalog", catalogRouter);
apiRouter.use("/me", meRouter);
apiRouter.use("/notifications", notificationsRouter);
