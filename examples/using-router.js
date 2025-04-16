import { Server, Router } from "../dist/index.js";

const app = new Server();

const route = Router.get("/", (_request, response) => {
  response.end("Hello, World!");
});

app.route(route);

app.listen(3000, () => {
  console.log("The server is running on http://localhost:3000");
});
