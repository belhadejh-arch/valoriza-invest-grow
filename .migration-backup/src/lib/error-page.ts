export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>تعذّر تحميل الصفحة — فالوريزا</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.6 system-ui, -apple-system, sans-serif; background: #071328; color: #f1f5f9; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; text-align: center; }
      .card { max-width: 28rem; width: 100%; padding: 2rem; background: #0b1a36; border: 1px solid rgba(0, 210, 255, 0.2); border-radius: 1.5rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      h1 { font-size: 1.25rem; margin: 0 0 0.75rem; color: #fff; font-weight: 800; }
      p { color: #94a3b8; margin: 0 0 1.5rem; font-size: 0.875rem; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.6rem 1.25rem; border-radius: 0.75rem; font: inherit; font-size: 0.875rem; font-weight: bold; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; }
      .primary { background: linear-gradient(135deg, #00d2ff, #0b51d8); color: #fff; border: none; }
      .secondary { background: rgba(255,255,255,0.06); color: #e2e8f0; border-color: rgba(255,255,255,0.15); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>تعذّر تحميل الصفحة</h1>
      <p>حدث خطأ غير متوقع أثناء معالجة الطلب. يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">إعادة المحاولة</button>
        <a class="secondary" href="/">الصفحة الرئيسية</a>
      </div>
    </div>
  </body>
</html>`;
}
