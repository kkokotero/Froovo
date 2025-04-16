import { Server } from "../dist/index.js";

const app = new Server();

function middleware(request, _response, next) {
  console.log(`Middleware activated for route: ${request.url}`);
  next();
}

app.get("/", middleware, (request, response) => {
  response.end("Hello, World!");
});

app.listen(3000, () => {
  console.log("The server is running on http://localhost:3000");
});
