const fs = require("fs");
const realTemplate = fs.readFileSync(__dirname + '/../../src/template.html', 'utf8');
module.exports = realTemplate;
