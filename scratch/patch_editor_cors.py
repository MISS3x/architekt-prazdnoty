import re

with open("editor_server.js", "r", encoding="utf-8") as f:
    content = f.read()

cors_code = """
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  next();
});
"""

if "Access-Control-Allow-Origin" not in content:
    content = content.replace("app.use(express.static(__dirname));", f"app.use(express.static(__dirname));\n{cors_code}")
    with open("editor_server.js", "w", encoding="utf-8") as f:
        f.write(content)
    print("CORS added to editor_server.js")
else:
    print("CORS already present.")
