const handler = require('./api/echo.js');

const req = {
  method: 'POST',
  url: '/api/echo',
  on: (event, cb) => {
    if (event === 'data') {
      setTimeout(() => cb(Buffer.from(JSON.stringify({
        message: "Je suis calme mais inquiet à l'idée de changer de vie",
        mode: 'neutral'
      }))), 10);
    }
    if (event === 'end') {
      setTimeout(cb, 20);
    }
  }
};

const res = {
  writeHead() {},
  setHeader() {},
  end(body) {
    console.log('\n📤 Réponse de l\'API:\n');
    console.log(JSON.stringify(JSON.parse(body), null, 2));
    process.exit(0);
  }
};

console.log('📥 Envoi: "Je suis calme mais inquiet à l\'idée de changer de vie" (mode: neutral)\n');
handler(req, res);
