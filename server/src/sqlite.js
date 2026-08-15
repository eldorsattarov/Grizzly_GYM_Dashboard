// ============================================================
// SQLITE MOSLASHTIRGICH
//
// Node 22.5+ da `node:sqlite` moduli o'rnatilgan holda keladi —
// hech qanday native kutubxona kompilyatsiya qilish shart emas.
// Eski Node versiyalarida better-sqlite3 ga qaytamiz.
//
// Ikkalasi ham bir xil interfeys beradi:
//   db.exec(sql)
//   db.pragma('journal_mode = WAL')
//   db.prepare(sql).run/get/all(...)
//   db.transaction(fn)
// ============================================================

let DatabaseSync = null;

try {
  // Node 24+ da hech qanday flagsiz ishlaydi
  ({ DatabaseSync } = await import('node:sqlite'));
} catch {
  DatabaseSync = null;
}

// ------------------------------------------------------------
// node:sqlite ustidan better-sqlite3 uslubidagi qobiq
// ------------------------------------------------------------
function wrapNative(file) {
  const raw = new DatabaseSync(file);

  // node:sqlite lastInsertRowid ni BigInt qaytaradi — songa aylantiramiz
  const fixResult = (r) => ({
    changes: Number(r?.changes ?? 0),
    lastInsertRowid: Number(r?.lastInsertRowid ?? 0),
  });

  const wrapStatement = (stmt) => ({
    run: (...args) => fixResult(stmt.run(...args)),
    get: (...args) => stmt.get(...args) ?? undefined,
    all: (...args) => stmt.all(...args),
  });

  return {
    exec: (sql) => raw.exec(sql),

    pragma: (statement) => raw.exec(`PRAGMA ${statement};`),

    prepare: (sql) => wrapStatement(raw.prepare(sql)),

    // Tranzaksiya: xato bo'lsa hammasi bekor qilinadi
    transaction: (fn) => (...args) => {
      raw.exec('BEGIN');
      try {
        const result = fn(...args);
        raw.exec('COMMIT');
        return result;
      } catch (err) {
        try { raw.exec('ROLLBACK'); } catch { /* allaqachon yopilgan */ }
        throw err;
      }
    },

    close: () => raw.close(),
    _driver: 'node:sqlite',
  };
}

// ------------------------------------------------------------
// Ochish
// ------------------------------------------------------------
export async function openDatabase(file) {
  if (DatabaseSync) {
    return wrapNative(file);
  }

  // Eski Node — better-sqlite3 ga qaytamiz
  try {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(file);
    db._driver = 'better-sqlite3';
    return db;
  } catch {
    throw new Error(
      "SQLite topilmadi.\n" +
      "Node.js 22.5 yoki undan yangi versiyasini o'rnating (tavsiya etiladi),\n" +
      "yoki server papkasida `npm install better-sqlite3` buyrug'ini bajaring."
    );
  }
}
