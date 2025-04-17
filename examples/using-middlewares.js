import froovo from "../dist/src/index.js";

const app = froovo();

async function middleware(request, _response, next) {
  console.log(`Middleware activated for route: ${request.url}`);
  next();
}

app.get("/", middleware, (request, response) => {
  response.end("Hello, World!");
});

app.listen(3000, () => {
  console.log("The server is running on http://localhost:3000");
});
