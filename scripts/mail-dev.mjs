import { createServer } from "node:http";
const messages = [];
createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/mail") {
    let data = "";
    for await (const chunk of req) {
      data += chunk;
      if (data.length > 16384) {
        res.writeHead(413).end();
        return;
      }
    }
    try {
      const mail = JSON.parse(data);
      messages.unshift({
        ...mail,
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
      });
      messages.splice(50);
      res.writeHead(204).end();
    } catch {
      res.writeHead(400).end();
    }
    return;
  }
  if (req.url === "/messages") {
    res
      .writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      })
      .end(JSON.stringify(messages));
    return;
  }
  res
    .writeHead(200, {
      "Content-Type": "text/html",
      "Cache-Control": "no-store",
    })
    .end(
      '<!doctype html><html lang="en"><meta charset="utf-8"><title>TBA · Local inbox</title><style>body{font:14px system-ui;max-width:800px;margin:60px auto;padding:20px;background:#f8faff;color:#223}article{background:#fff;border:1px solid #dde;padding:24px;border-radius:12px;margin:14px 0}pre{white-space:pre-wrap}small{color:#789}iframe{width:100%;height:650px;border:0;margin-top:18px;background:#f3f5f9;border-radius:10px}</style><h1>Local development inbox</h1><p>Local test delivery. Messages stay in memory and are cleared on restart.</p><main id="messages"></main><script>async function refresh(){const mails=await fetch("/messages").then(r=>r.json());const root=document.querySelector("main");root.replaceChildren();for(const mail of mails){const a=document.createElement("article");for(const [tag,key] of [["strong","subject"],["p","to"],["pre","text"],["small","date"]]){const e=document.createElement(tag);e.textContent=mail[key];a.append(e)}if(mail.html){const frame=document.createElement("iframe");frame.setAttribute("sandbox","");frame.referrerPolicy="no-referrer";frame.title=mail.subject;frame.srcdoc=`<meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos;">`+mail.html;a.append(frame)}root.append(a)}}refresh();setInterval(refresh,2000)</script></html>',
    );
}).listen(8025, "127.0.0.1", () =>
  console.log(
    "Local inbox available at http://127.0.0.1:8025. Codes are not written to logs.",
  ),
);
