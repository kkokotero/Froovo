import froovo from "../dist/src/index.js";

const app = froovo();

app.get("/", (_request, response) => {
  response.write("Hello, World!");
});

app.listen(3000, () => {
  console.log("The server is running on http://localhost:3000");
});
