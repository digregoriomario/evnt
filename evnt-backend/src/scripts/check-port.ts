import net from "net";

const port = Number(process.env.PORT ?? 4000);

const server = net.createServer();

server.once("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Porta ${port} gia in uso. Ferma Docker con "docker compose stop api nginx" oppure chiudi il processo che occupa la porta.`
    );
    process.exit(1);
  }

  console.error(error.message || "Porta backend non disponibile.");
  process.exit(1);
});

server.once("listening", () => {
  server.close(() => process.exit(0));
});

server.listen(port);
