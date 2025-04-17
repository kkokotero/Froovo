import froovo from "../dist/src/index.js";

const app = froovo();

app.ws("/*", {
  open(ws) {
    ws.subscribe("app");
    ws.send("Hello everyone!");
  },
  message(_ws, msg) {
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(msg);

    console.log(text);
  },
});

app.listen(3000, () => {
  console.log("The server is running on http://localhost:3000");
});
