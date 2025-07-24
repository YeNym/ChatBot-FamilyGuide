const db = require('../../firebase');

async function checkAdminRole(userId, requiredRole) {
    const doc = await db.collection('admins').doc(userId.toString()).get();
    const userRole = doc.exists ? doc.data().role : 'user';


    const rolePriority = {
        'user': 1,
        'admin': 2,
        'moderator': 3,
        'superadmin': 4,
    };

    if (rolePriority[userRole] < rolePriority[requiredRole]) {
        return { ok: false, message: '❌ Недостаточно прав для выполнения этого действия.' };
    }

    return { ok: true, data: { role: userRole, ...(doc.data() || {}) } };
}


module.exports = { checkAdminRole };