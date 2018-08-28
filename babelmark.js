const express = require('express');
const SimpleMarkdown = require('./simple-markdown');

const app = express();
const packagejson = require('./package.json');

app.get('/api/babelmark', (req, res) => {
  const source = req.query.text || "please provide a \\?text= param";
  const result = SimpleMarkdown.markdownToHtml(source);
  res.json({
    name: 'simple-markdown.js',
    version: packagejson.version,
    html: result
  });
});

app.listen(process.env.PORT || 3000);
