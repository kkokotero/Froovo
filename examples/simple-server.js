import { Server } from "../dist/index.js";

const app = new Server();

app.get("/", (_request, response) => {
  response.end("Hello, World!");
});

app.listen(3000, () => {
  console.log("The server is running on http://localhost:3000");
});
