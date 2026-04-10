const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Saboora backend running"));

const PORT = process.env.PORT || 5432;
app.listen(PORT, () => {
  console.log(`🚀 API running on https://cjgmytfphahbphmogbye.supabase.co:${5432}`);
});