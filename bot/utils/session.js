const { checkAdminRole } = require('./utils');

const sessions = {};

const getSession = async (userId) => {
    if (!sessions[userId]) {
        const check = await checkAdminRole(userId, 'user');
        sessions[userId] = {
            role: check.data?.role || 'user',
            name: check.data?.name || '',
        };
    }
    return sessions[userId];
};

const clearSession = (userId) => {
    delete sessions[userId];
};

module.exports = {
    getSession,
    clearSession,
    sessions,
};
