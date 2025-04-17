import froovo from "../dist/src/index.js";

const app = froovo();

app.get("/", async (request, response) => {
  const body = await request.body;
  console.log(body);
  response.write("Helo");
});

app.listen(3000, () => {
  console.log("The server is running on http://localhost:3000");
});
