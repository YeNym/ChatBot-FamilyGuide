// src/listeners/QuestionsNotifier.js

/**
 * Оповещает о новых вопросах:
 *  - всем admin/superadmin из коллекции `admins`
 *  - всем из коллекции `approvedSpecialists` (поле userId обязательно)
 * Отправка — чистый текст, без кнопок.
 */

function startQuestionsNotifier(bot, db, opts = {}) {
    const {
        adminsCacheTtlMs = 60_000,          // кэш 60 сек
        specialistsCacheTtlMs = 60_000,     // кэш 60 сек
        collectionQuestions = 'questions',
        collectionAdmins = 'admins',
        collectionApproved = 'approvedSpecialists',
    } = opts;

    console.log('📡 QuestionsNotifier активирован.');

    // --- простые кэши
    let adminsCache = { ids: [], loadedAt: 0 };
    let specialistsCache = { ids: [], loadedAt: 0 };

    async function fetchAdminChatIds() {
        const now = Date.now();
        if (now - adminsCache.loadedAt < adminsCacheTtlMs && adminsCache.ids.length) {
            return adminsCache.ids;
        }

        let adminDocs = [];
        try {
            const s = await db.collection(collectionAdmins)
                .where('role', 'in', ['admin', 'superadmin'])
                .get();
            adminDocs = s.docs;
        } catch (e) {
            console.warn('⚠ IN-query по admins недоступен, фолбэк:', e.message);
            const [a, su] = await Promise.all([
                db.collection(collectionAdmins).where('role', '==', 'admin').get(),
                db.collection(collectionAdmins).where('role', '==', 'superadmin').get(),
            ]);
            adminDocs = [...a.docs, ...su.docs];
        }

        const adminChatIds = Array.from(new Set(
            adminDocs
                .map(d => Number((d.data() || {}).userId))
                .filter(n => Number.isFinite(n))
        ));

        adminsCache = { ids: adminChatIds, loadedAt: now };

        console.log(`👥 Админы: ${adminChatIds.length} → ${adminChatIds.join(', ') || '(пусто)'}`);
        return adminChatIds;
    }

    async function fetchApprovedSpecialistChatIds() {
        const now = Date.now();
        if (now - specialistsCache.loadedAt < specialistsCacheTtlMs && specialistsCache.ids.length) {
            return specialistsCache.ids;
        }

        const snap = await db.collection(collectionApproved).get();
        // userId может быть строкой — приведём к числу, если возможно
        const ids = Array.from(new Set(
            snap.docs
                .map(d => (d.data() || {}).userId)
                .map(v => {
                    // допускаем номера в строках; если не число — отфильтруем
                    const n = Number(v);
                    return Number.isFinite(n) ? n : null;
                })
                .filter(n => Number.isFinite(n))
        ));

        specialistsCache = { ids, loadedAt: now };

        console.log(`👥 Подтверждённые специалисты: ${ids.length} → ${ids.join(', ') || '(пусто)'}`);
        return ids;
    }

    // --- основной слушатель
    const unsubscribe = db.collection(collectionQuestions)
        .onSnapshot(
            async (snap) => {
                const changes = snap.docChanges();
                if (!changes.length) return;

                console.log(`👂 changes: ${changes.map(c => c.type).join(', ')}, size: ${snap.size}`);

                // Загружаем получателей один раз на партию
                const [adminChatIds, specialistChatIds] = await Promise.all([
                    fetchAdminChatIds(),
                    fetchApprovedSpecialistChatIds()
                ]);

                // Объединяем и убираем дубли
                const recipients = Array.from(new Set([...adminChatIds, ...specialistChatIds]));
                console.log(`📨 Итоговый список получателей: ${recipients.length}`);

                for (const ch of changes) {
                    if (ch.type !== 'added') continue;

                    const ref = ch.doc.ref;
                    const q = ch.doc.data();
                    const qid = ch.doc.id;

                    if (q.notified === true) {
                        console.log(`↩️ ${qid} уже notified=true — пропускаем`);
                        continue;
                    }

                    const name = (q.name || 'Пользователь').toString();
                    const userId = q.userId;
                    const questionText = (q.question || '').toString();

                    const plain = [
                        '📩 Новый вопрос',
                        questionText,
                    ].join('\n');

                    console.log(`➡️ рассылаю сообщение по вопросу ${qid} (${recipients.length} получателей)...`);

                    const results = await Promise.allSettled(
                        recipients.map(async chatId => {
                            await bot.sendMessage(chatId, plain); // только текст
                            return chatId;
                        })
                    );

                    const ok = results.filter(r => r.status === 'fulfilled').length;
                    const fail = results.length - ok;
                    console.log(`📬 Рассылка по ${qid}: отправлено=${ok}, ошибок=${fail}`);

                    results
                        .filter(r => r.status === 'rejected')
                        .forEach((r, i) => console.error(`❌ Ошибка доставки [${i}]:`, r.reason?.message || r.reason));

                    try {
                        await ref.update({ notified: true, notifiedAt: new Date() });
                        console.log(`✅ ${qid} помечен notified=true`);
                    } catch (err) {
                        console.error(`❌ Не удалось обновить ${qid}:`, err.message);
                    }
                }
            },
            (err) => {
                console.error('❌ QuestionsNotifier error:', err);
            }
        );

    return unsubscribe;
}

module.exports = startQuestionsNotifier;
